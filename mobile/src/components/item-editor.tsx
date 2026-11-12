// The add and edit item form. Paste or share a link and it fills in the name,
// price and pictures; everything stays editable.

import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  classifyStoreLink,
  copyLinkSteps,
  storesWithRegistryLinks,
  type RetailerRegistry,
  type StoreId,
} from "@shared/retailers";

import { Icon } from "@/components/icon";
import { ItemImage } from "@/components/item-image";
import { PasteLinkButton } from "@/components/paste-link-button";
import { ProductReader } from "@/components/product-reader";
import {
  Button,
  Chip,
  Divider,
  Field,
  haptic,
  IconButton,
  Section,
  Stepper,
  SwitchRow,
  Text,
} from "@/components/ui";
import {
  errorMessage,
  storeRegistries,
  useAddItem,
  useCreateCategory,
  useDeleteItem,
  useRegistry,
  useUpdateItem,
} from "@/lib/data";
import { parsePrice } from "@/lib/format";
import { itemMatchKey, normalizeLink, parseSharedText, storeLabel, type ReadProduct } from "@/lib/product";
import { radius, spacing, useTheme } from "@/lib/theme";
import { USED_CONDITIONS, type Item, type ItemInput, type RegistrySummary, type UsedCondition } from "@/lib/types";

// Short links hide the product's real address. After reading one, keep the
// address it led to, so the item matches the same product's other links.
const SHORT_LINK_HOSTS = ["a.co", "amzn.to", "amzn.eu", "tgt.gifts", "walmrt.us"];

function isShortLink(raw: string) {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return SHORT_LINK_HOSTS.includes(host);
  } catch {
    return false;
  }
}

export type EditorResult =
  | { type: "added"; registryId: string; title: string }
  | { type: "saved"; registryId: string }
  | { type: "deleted"; registryId: string };

interface Props {
  mode: "add" | "edit";
  registryId: string | null;
  /** Offered as a choice when adding. Leave out to keep the registry fixed. */
  registries?: RegistrySummary[];
  onRegistryChange?: (id: string) => void;
  item?: Item;
  /** A link and maybe a name from a share or a deep link. */
  initialLink?: string | null;
  initialTitle?: string | null;
  /** Already read in Safari by the share extension, so there's nothing to load. */
  initialProduct?: ReadProduct | null;
  onDone: (result: EditorResult) => void;
  /** Shown above the form, e.g. what was shared. */
  header?: ReactNode;
}

type ReadState = "idle" | "reading" | "done" | "failed";

export function ItemEditor({
  mode,
  registryId,
  registries,
  onRegistryChange,
  item,
  initialLink,
  initialTitle,
  initialProduct,
  onDone,
  header,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const detail = useRegistry(registryId ?? undefined);
  const addItem = useAddItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const createCategory = useCreateCategory();

  const startingLink = item?.external_url ?? (initialLink ? normalizeLink(initialLink) : null) ?? "";
  const [link, setLink] = useState(startingLink);
  // A page read in Safari usually has everything. Without a price, read the
  // link here too; that only fills in what's still empty.
  const readHere = mode === "add" && Boolean(startingLink) && (!initialProduct || initialProduct.price == null);
  const [readingUrl, setReadingUrl] = useState<string | null>(readHere ? startingLink : null);
  const [readState, setReadState] = useState<ReadState>(readHere ? "reading" : initialProduct ? "done" : "idle");
  const [images, setImages] = useState<string[]>(
    initialProduct?.images.length ? initialProduct.images : item?.image_url ? [item.image_url] : []
  );
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? initialProduct?.images[0] ?? null);

  const [title, setTitle] = useState(item?.title ?? initialProduct?.title ?? initialTitle ?? "");
  const [titleTouched, setTitleTouched] = useState(mode === "edit");
  const [priceText, setPriceText] = useState(
    item?.price != null ? String(item.price) : initialProduct?.price != null ? String(initialProduct.price) : ""
  );
  const [priceTouched, setPriceTouched] = useState(mode === "edit");
  const [quantity, setQuantity] = useState(item?.quantity_needed ?? 1);
  const [categoryId, setCategoryId] = useState<string | null>(item?.category_id ?? null);
  const [mostWanted, setMostWanted] = useState(item?.is_essential ?? false);
  const [bought, setBought] = useState(item?.is_parent_purchased ?? false);
  const [openToUsed, setOpenToUsed] = useState(item?.is_open_to_used ?? false);
  const [condition, setCondition] = useState<UsedCondition>(item?.minimum_condition ?? "like-new");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  const categories = detail.data?.categories ?? [];
  // Store registries are for baby registries only, as on the website.
  const linkedRegistries = detail.data ? storeRegistries(detail.data.registry) : null;
  // A registry link on any item shows the owner has a registry at that store,
  // even before they link it in settings, as on the website's dashboard.
  const registryLinkStores = useMemo(
    () => storesWithRegistryLinks((detail.data?.items ?? []).map((i) => i.external_url)),
    [detail.data?.items]
  );
  const duplicate = useMemo(() => {
    const key = itemMatchKey(link);
    if (!key) return null;
    return detail.data?.items.find((i) => i.id !== item?.id && itemMatchKey(i.external_url) === key) ?? null;
  }, [link, detail.data?.items, item?.id]);

  function startReading(raw: string) {
    const { url } = parseSharedText(raw);
    const normalized = normalizeLink(url ?? raw);
    if (!normalized) {
      setError("That doesn't look like a link.");
      return;
    }
    setError(null);
    setLink(normalized);
    setConfirmedDuplicate(false);
    setReadingUrl(normalized);
    setReadState("reading");
  }

  function onProduct(product: ReadProduct | null) {
    const source = readingUrl;
    setReadingUrl(null);
    if (!product) {
      // Safari already gave us something, so that still counts.
      setReadState(initialProduct ? "done" : "failed");
      return;
    }
    setReadState("done");
    haptic("success");
    if (product.title && (!titleTouched || !title.trim())) setTitle(product.title);
    if (product.price != null && (!priceTouched || !priceText.trim())) setPriceText(String(product.price));
    if (product.images.length > 0) {
      setImages(product.images);
      if (!imageUrl || mode === "add") setImageUrl(product.images[0]);
    }
    if (source && product.url && isShortLink(source)) setLink(product.url);
  }

  function input(): ItemInput {
    return {
      title,
      external_url: link.trim() ? normalizeLink(link) : null,
      image_url: imageUrl,
      price: parsePrice(priceText),
      quantity_needed: quantity,
      category_id: categoryId,
      is_essential: mostWanted,
      is_parent_purchased: bought,
      is_open_to_used: openToUsed,
      minimum_condition: openToUsed ? condition : null,
      notes,
    };
  }

  function save() {
    setError(null);
    if (!registryId) {
      setError("Pick a registry first.");
      return;
    }
    if (!title.trim()) {
      setError("Give the item a name.");
      return;
    }
    if (link.trim() && !normalizeLink(link)) {
      setError("The link doesn't look right. Fix it or clear it.");
      return;
    }
    if (duplicate && mode === "add" && !confirmedDuplicate) {
      setConfirmedDuplicate(true);
      haptic("warning");
      return;
    }
    if (mode === "add") {
      addItem.mutate(
        { registryId, input: input() },
        {
          onSuccess: (added) => {
            haptic("success");
            onDone({ type: "added", registryId, title: added.title });
          },
          onError: (e) => setError(errorMessage(e)),
        }
      );
    } else if (item) {
      updateItem.mutate(
        { item, input: input() },
        // The form has closed by then, so say so in an alert. The list goes back to how it was.
        { onError: (e) => Alert.alert("Couldn't save your changes", errorMessage(e)) }
      );
      // The list updates right away; the save finishes in the background.
      haptic("success");
      onDone({ type: "saved", registryId });
    }
  }

  function confirmDelete() {
    if (!item) return;
    const reserved = item.quantity_fulfilled > 0 && !item.is_parent_purchased;
    const message = reserved
      ? "Someone has already reserved this. Deleting it removes it from your registry, and their reservation stays in gift activity."
      : "This removes it from your registry.";
    const run = () => {
      deleteItem.mutate(item, { onError: (e) => Alert.alert("Couldn't delete it", errorMessage(e)) });
      haptic("success");
      onDone({ type: "deleted", registryId: item.registry_id });
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(`Delete “${item.title}”? ${message}`)) run();
      return;
    }
    Alert.alert(`Delete “${item.title}”?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  }

  function addCategory() {
    const name = newCategory?.trim();
    if (!name || !registryId) return;
    createCategory.mutate(
      { registryId, name, sortOrder: categories.length },
      {
        onSuccess: (category) => {
          setCategoryId(category.id);
          setNewCategory(null);
        },
        onError: (e) => setError(errorMessage(e)),
      }
    );
  }

  const saving = addItem.isPending;
  const store = storeLabel(link);
  const openUrl = normalizeLink(link);
  const saveTitle =
    mode === "edit" ? "Save changes" : duplicate && confirmedDuplicate ? "Add it again" : "Add to registry";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={64}>
      {readingUrl ? <ProductReader key={readingUrl} url={readingUrl} onResult={onProduct} /> : null}
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
      >
        {header}

        {mode === "add" && registries && registries.length > 1 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="footnote" tone="secondary" style={{ fontWeight: "600" }}>
              Registry
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {registries.map((r) => (
                <Chip
                  key={r.id}
                  label={r.title}
                  selected={r.id === registryId}
                  onPress={() => {
                    onRegistryChange?.(r.id);
                    setCategoryId(null);
                    setConfirmedDuplicate(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* The link, and what reading it found */}
        <View style={{ gap: spacing.sm }}>
          <Field
            label="Product link"
            value={link}
            onChangeText={(text) => {
              setLink(text);
              setConfirmedDuplicate(false);
              if (readState === "failed") setReadState("idle");
            }}
            onSubmitEditing={() => link.trim() && startReading(link)}
            onEndEditing={() => {
              const normalized = normalizeLink(link);
              if (mode === "add" && normalized && normalized !== readingUrl && readState === "idle") startReading(link);
            }}
            placeholder="Paste a link from any store"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            returnKeyType="go"
            trailing={
              link ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  {openUrl ? <OpenLinkButton url={openUrl} /> : null}
                  <IconButton
                    icon="close"
                    size={16}
                    color={theme.textTertiary}
                    accessibilityLabel="Clear link"
                    onPress={() => {
                      setLink("");
                      setReadingUrl(null);
                      setReadState("idle");
                    }}
                  />
                </View>
              ) : null
            }
          />
          {!link ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <PasteLinkButton onPaste={startReading} />
              <Text variant="footnote" tone="tertiary" style={{ flex: 1 }}>
                Or share a product to Regibee from any store's app or website.
              </Text>
            </View>
          ) : null}
          <ReadStatus state={readState} store={store} />
          {linkedRegistries ? (
            <StoreLinkStatus link={link} linkedRegistries={linkedRegistries} registryLinkStores={registryLinkStores} />
          ) : null}
          {duplicate && mode === "add" ? (
            <View style={[styles.notice, { backgroundColor: theme.accentSoft }]}>
              <Icon name="error" size={16} color={theme.onAccentSoft} />
              <Text variant="footnote" style={{ flex: 1, color: theme.onAccentSoft }}>
                “{duplicate.title}” with this link is already on this registry.
                {confirmedDuplicate ? " Tap the button again to add it anyway." : ""}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Pictures */}
        {images.length > 0 || imageUrl ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ alignItems: "center" }}>
              <ItemImage uri={imageUrl} size={180} rounded={radius.lg} />
            </View>
            {images.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
                {images.map((uri) => (
                  <Pressable
                    key={uri}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Use this picture"
                    accessibilityState={{ selected: uri === imageUrl }}
                    onPress={() => {
                      haptic();
                      setImageUrl(uri);
                    }}
                    style={{
                      borderRadius: radius.md + 2,
                      borderWidth: 2,
                      borderColor: uri === imageUrl ? theme.tint : "transparent",
                    }}
                  >
                    <ItemImage uri={uri} size={56} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* Details */}
        <View style={{ gap: spacing.lg }}>
          <Field
            label="Name"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setTitleTouched(true);
            }}
            placeholder={readState === "reading" ? "Reading the page…" : "What is it?"}
            multiline
            style={{ minHeight: 44 }}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
          />
          <View style={{ flexDirection: "row", gap: spacing.lg, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Price"
                value={priceText}
                onChangeText={(text) => {
                  setPriceText(text.replace(/[^0-9.,]/g, ""));
                  setPriceTouched(true);
                }}
                onBlur={() => {
                  const value = parsePrice(priceText);
                  if (value != null) setPriceText(value.toFixed(2));
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                leading={<Text tone="tertiary">$</Text>}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text variant="footnote" tone="secondary" style={{ fontWeight: "600" }}>
                Quantity
              </Text>
              {/* As tall as the price field, so the two line up. */}
              <View style={{ height: 50, justifyContent: "center" }}>
                <Stepper value={quantity} onChange={setQuantity} />
              </View>
            </View>
          </View>
        </View>

        {/* Category */}
        {registryId ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="footnote" tone="secondary" style={{ fontWeight: "600" }}>
              Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <Chip label="None" selected={categoryId === null} onPress={() => setCategoryId(null)} />
              {categories.map((c) => (
                <Chip key={c.id} label={c.name} selected={c.id === categoryId} onPress={() => setCategoryId(c.id)} />
              ))}
              {newCategory === null ? (
                <Chip label="+ New" selected={false} onPress={() => setNewCategory("")} />
              ) : null}
            </View>
            {newCategory !== null ? (
              <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Field
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder="New category"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={addCategory}
                  />
                </View>
                <Button title="Add" size="medium" onPress={addCategory} loading={createCategory.isPending} disabled={!newCategory.trim()} />
              </View>
            ) : null}
          </View>
        ) : null}

        <Section>
          <SwitchRow
            icon="star"
            label="Most wanted"
            description="Shown first, with a star, on your registry."
            value={mostWanted}
            onValueChange={setMostWanted}
          />
          <Divider inset={52} />
          <SwitchRow
            icon="checkCircle"
            label="I bought it myself"
            description="Guests can still give it by sending you the money for it."
            value={bought}
            onValueChange={setBought}
          />
          <Divider inset={52} />
          <SwitchRow
            icon="refresh"
            label="Open to used"
            description="Guests may give one secondhand."
            value={openToUsed}
            onValueChange={setOpenToUsed}
          />
          {openToUsed ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              {USED_CONDITIONS.map((c) => (
                <Chip key={c.id} label={`${c.label} or better`} selected={condition === c.id} onPress={() => setCondition(c.id)} />
              ))}
            </View>
          ) : null}
        </Section>

        <Field
          label="Note for guests"
          value={notes}
          onChangeText={setNotes}
          placeholder="Size, color, or anything else that helps"
          multiline
        />

        {mode === "edit" ? (
          <Button title="Delete item" variant="danger" icon="trash" onPress={confirmDelete} />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {error ? (
          <Text variant="footnote" tone="danger" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={saveTitle} onPress={save} loading={saving} disabled={!registryId} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Opens the link as typed in the in-app browser, to check it's the right page. */
function OpenLinkButton({ url }: { url: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open link"
      accessibilityHint="Opens the page in a browser"
      hitSlop={6}
      onPress={() => {
        haptic();
        WebBrowser.openBrowserAsync(url);
      }}
      style={({ pressed }) => [styles.openButton, { backgroundColor: theme.tintSoft, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name="external" size={13} color={theme.tint} weight="semibold" />
      <Text variant="footnote" tone="tint" style={{ fontWeight: "600" }}>
        Open
      </Text>
    </Pressable>
  );
}

/**
 * Whether gifts bought through the link count toward the owner's store
 * registry, worded as the website's StoreLinkNotice
 * (src/components/store-link-notice.tsx). It shows only the two clear cases: a
 * registry link, and a plain link at a store where the owner has a registry.
 */
function StoreLinkStatus({
  link,
  linkedRegistries,
  registryLinkStores,
}: {
  link: string;
  linkedRegistries: RetailerRegistry[];
  registryLinkStores: StoreId[];
}) {
  const theme = useTheme();
  // Remember which link the owner dismissed, so a new one shows the warning again.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const result = classifyStoreLink(link);
  if (!result || dismissedFor === link) return null;
  const { store, kind } = result;

  if (kind === "registry") {
    return (
      <View style={[styles.notice, { backgroundColor: theme.successSoft }]} accessibilityLiveRegion="polite">
        <Icon name="checkCircle" size={16} color={theme.success} />
        <Text variant="footnote" tone="success" style={{ flex: 1 }}>
          <Text variant="footnote" tone="success" style={{ fontWeight: "600" }}>
            {store.name} registry link.
          </Text>{" "}
          Gifts bought through this link count toward your {store.name} registry.
        </Text>
      </View>
    );
  }

  // Only warn when the owner has a registry at this store. Otherwise the
  // warning would be noise.
  const linked = linkedRegistries.find((r) => r.store === store.id);
  if (kind !== "plain" || (!linked && !registryLinkStores.includes(store.id))) return null;

  const color = { color: theme.onAccentSoft };
  return (
    <View style={[styles.notice, { backgroundColor: theme.accentSoft }]} accessibilityLiveRegion="polite">
      <Icon name="error" size={16} color={theme.onAccentSoft} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Text variant="footnote" style={color}>
          <Text variant="footnote" style={[color, { fontWeight: "600" }]}>
            This looks like a regular {store.name} link.
          </Text>{" "}
          Gifts bought through it may not count toward your {store.name} registry.
        </Text>
        <View style={{ gap: 2 }}>
          <Text variant="footnote" style={[color, { fontWeight: "600" }]}>
            To use your registry link instead
          </Text>
          {copyLinkSteps(store).map((step, index) => (
            <Text key={step} variant="footnote" style={color}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.md, rowGap: spacing.xs }}>
          {linked ? (
            <Button
              title={`Open my ${store.name} registry`}
              icon="external"
              variant="secondary"
              size="small"
              onPress={() => WebBrowser.openBrowserAsync(linked.url)}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDismissedFor(link)}
            style={({ pressed }) => ({ minHeight: 36, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
          >
            <Text variant="footnote" style={[color, { fontWeight: "600", textDecorationLine: "underline" }]}>
              Use this link anyway
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ReadStatus({ state, store }: { state: ReadState; store: string | null }) {
  const theme = useTheme();
  if (state === "reading") {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={theme.tint} />
        <Text variant="footnote" tone="secondary">
          Reading the product{store ? ` from ${store}` : ""}…
        </Text>
      </View>
    );
  }
  if (state === "done") {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <Icon name="checkCircle" size={16} color={theme.success} />
        <Text variant="footnote" tone="secondary">
          Filled in from {store ?? "the page"}. Check it over.
        </Text>
      </View>
    );
  }
  if (state === "failed") {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <Icon name="error" size={16} color={theme.textTertiary} />
        <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
          Couldn't read that page. Fill in the details below.
        </Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  status: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 20 },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

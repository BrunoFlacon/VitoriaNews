export interface ContactTagAssignment {
  contactId: string;
  tagNames: string[];
}

export async function resolveImportTagIds(
  supabase: any,
  opts: {
    userId: string;
    tagNames: string[];
    canCreateTags: boolean;
  }
): Promise<{
  tagIdByKey: Map<string, string>;
  skippedNames: string[];
}> {
  const { userId, tagNames, canCreateTags } = opts;
  const uniqueNames = [...new Set(tagNames.map(n => n.trim().toLowerCase()))].filter(Boolean);
  if (uniqueNames.length === 0) return { tagIdByKey: new Map(), skippedNames: [] };

  const { data: existingTags } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId);

  const existingMap = new Map<string, { id: string; name: string }>();
  for (const tag of existingTags ?? []) {
    existingMap.set(tag.name.trim().toLowerCase(), tag);
  }

  const tagIdByKey = new Map<string, string>();
  const skippedNames: string[] = [];

  for (const name of uniqueNames) {
    const existing = existingMap.get(name);
    if (existing) {
      tagIdByKey.set(name, existing.id);
    } else if (canCreateTags) {
      const { data: newTag } = await supabase
        .from('tags')
        .insert({ user_id: userId, name, color: '#3b82f6' })
        .select('id')
        .single();
      if (newTag) {
        tagIdByKey.set(name, newTag.id);
      }
    } else {
      skippedNames.push(name);
    }
  }

  return { tagIdByKey, skippedNames };
}

export async function assignImportedContactTags(
  supabase: any,
  assignments: ContactTagAssignment[],
  tagIdByKey: Map<string, string>
): Promise<number> {
  let count = 0;
  for (const { contactId, tagNames } of assignments) {
    const tagIds = tagNames
      .map(n => tagIdByKey.get(n.trim().toLowerCase()))
      .filter(Boolean) as string[];
    if (tagIds.length === 0) continue;

    const rows = tagIds.map(tag_id => ({ contact_id: contactId, tag_id }));
    const { error } = await supabase.from('contact_tags').insert(rows);
    if (!error) count += rows.length;
  }
  return count;
}

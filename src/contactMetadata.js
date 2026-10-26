const LEGACY_CONTACT_PREFIX = "[[HEV_CONTACT_V1:";

export function encodeLegacyContactMessage(form) {
  const metadata = {
    type: form.type,
    phone: form.phone,
    jobTitle: form.jobTitle,
    website: form.website,
    preferredContact: form.preferredContact,
    magazineIssue: form.magazineIssue,
    magazineFormat: form.magazineFormat,
    magazineBudget: form.magazineBudget
  };
  return `${LEGACY_CONTACT_PREFIX}${encodeURIComponent(JSON.stringify(metadata))}]]\n${form.message}`;
}

export function readLegacyContactMessage(message) {
  if (typeof message !== "string" || !message.startsWith(LEGACY_CONTACT_PREFIX)) return null;
  const end = message.indexOf("]]", LEGACY_CONTACT_PREFIX.length);
  if (end < 0) return null;
  try {
    const metadata = JSON.parse(decodeURIComponent(message.slice(LEGACY_CONTACT_PREFIX.length, end)));
    return {
      ...metadata,
      message: message.slice(end + 2).replace(/^\r?\n/, "")
    };
  } catch {
    return null;
  }
}

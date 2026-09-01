(function exposeAdultAccess(root) {
  const ADULT_TAG = "adult";
  const MINIMUM_AGE = 18;

  function integer(value) {
    const text = String(value == null ? "" : value).trim();
    if (!/^\d+$/.test(text)) {
      return null;
    }
    const number = Number.parseInt(text, 10);
    return Number.isSafeInteger(number) ? number : null;
  }

  function assessBirthDate(dayValue, monthValue, yearValue, today = new Date()) {
    const day = integer(dayValue);
    const month = integer(monthValue);
    const year = integer(yearValue);
    const current = today instanceof Date && Number.isFinite(today.getTime()) ? today : new Date();
    if (day == null || month == null || year == null || year < 1900) {
      return { valid: false, isAdult: false };
    }

    const birthDate = new Date(year, month - 1, day, 12, 0, 0, 0);
    const valid = birthDate.getFullYear() === year
      && birthDate.getMonth() === month - 1
      && birthDate.getDate() === day
      && birthDate.getTime() <= current.getTime();
    if (!valid) {
      return { valid: false, isAdult: false };
    }

    const adultCutoff = new Date(
      current.getFullYear() - MINIMUM_AGE,
      current.getMonth(),
      current.getDate(),
      23, 59, 59, 999
    );
    return {
      valid: true,
      isAdult: birthDate.getTime() <= adultCutoff.getTime()
    };
  }

  function isRestrictedPlugin(plugin) {
    return Array.isArray(plugin && plugin.tags)
      && plugin.tags.some((tag) => String(tag || "").trim().toLowerCase() === ADULT_TAG);
  }

  function visiblePlugins(plugins, accessEnabled) {
    const source = Array.isArray(plugins) ? plugins : [];
    return accessEnabled ? source.slice() : source.filter((plugin) => !isRestrictedPlugin(plugin));
  }

  const api = Object.freeze({
    ADULT_TAG,
    MINIMUM_AGE,
    assessBirthDate,
    isRestrictedPlugin,
    visiblePlugins
  });

  root.KapiTomoAdultAccess = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);

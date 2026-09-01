(function exposeCatalogPagination(root) {
  const DEFAULT_PAGE_SIZE = 20;

  function positiveInteger(value, fallback) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function paginate(items, requestedPage, pageSize = DEFAULT_PAGE_SIZE) {
    const source = Array.isArray(items) ? items : [];
    const size = positiveInteger(pageSize, DEFAULT_PAGE_SIZE);
    const totalItems = source.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const page = Math.min(positiveInteger(requestedPage, 1), totalPages);
    const startIndex = (page - 1) * size;
    const endIndex = Math.min(startIndex + size, totalItems);
    return {
      items: source.slice(startIndex, endIndex),
      page,
      pageSize: size,
      totalItems,
      totalPages,
      start: totalItems ? startIndex + 1 : 0,
      end: endIndex
    };
  }

  function visiblePageItems(totalPages, currentPage) {
    const total = positiveInteger(totalPages, 1);
    const current = Math.min(positiveInteger(currentPage, 1), total);
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages = new Set([1, total, current - 1, current, current + 1]);
    if (current <= 4) {
      [2, 3, 4, 5].forEach((page) => pages.add(page));
    }
    if (current >= total - 3) {
      [total - 4, total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
    }

    const ordered = [...pages]
      .filter((page) => page >= 1 && page <= total)
      .sort((first, second) => first - second);
    const output = [];
    ordered.forEach((page, index) => {
      if (index && page - ordered[index - 1] > 1) {
        output.push("ellipsis");
      }
      output.push(page);
    });
    return output;
  }

  root.KapiTomoPagination = Object.freeze({
    DEFAULT_PAGE_SIZE,
    paginate,
    visiblePageItems
  });
})(globalThis);

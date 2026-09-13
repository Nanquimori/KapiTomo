(function () {
  "use strict";

  var API_ORIGIN = "https://api.source.invalid";
  var CDN_ORIGIN = "https://cdn.source.invalid";
  var ROTATING_KEYS = [
    "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    "202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f",
    "404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f",
    "606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f",
    "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f"
  ];

  function fail(message) {
    throw new Error("Encrypted API example: " + message);
  }

  function hexBytes(value) {
    if (!/^[0-9a-f]{64}$/i.test(value)) fail("invalid synthetic key material");
    var output = new Uint8Array(value.length / 2);
    for (var index = 0; index < output.length; index += 1) {
      output[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return output;
  }

  function rotateRight(value, count) {
    return ((value >>> count) | (value << (8 - count))) & 255;
  }

  function reverseSBox(key) {
    var box = new Uint16Array(256);
    var reverse = new Uint16Array(256);
    var cursor = 0;
    var index;
    for (index = 0; index < 256; index += 1) box[index] = index;
    for (index = 0; index < 256; index += 1) {
      cursor = (cursor + box[index] + key[index % key.length]) % 256;
      var swap = box[index];
      box[index] = box[cursor];
      box[cursor] = swap;
    }
    for (index = 0; index < 256; index += 1) reverse[box[index]] = index;
    return reverse;
  }

  function decodeEnvelope(envelope) {
    if (!envelope || typeof envelope.d !== "string" || !Number.isInteger(envelope.k) || !Number.isInteger(envelope.v)) {
      fail("expected an envelope with d, k, and v");
    }
    var keyIndex = envelope.v === 1 ? 0 : envelope.k;
    if (keyIndex < 0 || keyIndex >= ROTATING_KEYS.length) fail("unknown rotating key index");
    var key = hexBytes(ROTATING_KEYS[keyIndex]);
    var reverse = reverseSBox(key);
    var binary;
    try {
      binary = atob(envelope.d);
    } catch (error) {
      fail("envelope d is not valid Base64");
    }
    var input = new Uint8Array(binary.length);
    var output = new Uint8Array(binary.length);
    var index;
    for (index = 0; index < binary.length; index += 1) input[index] = binary.charCodeAt(index) & 255;
    for (index = input.length - 1; index >= 0; index -= 1) {
      var value = input[index] ^ (index > 0 ? input[index - 1] : key[key.length - 1]);
      value = reverse[value] & 255;
      var rotation = ((key[(index + 3) % key.length] + (index & 255)) & 255) % 7 + 1;
      value = rotateRight(value, rotation) ^ key[index % key.length];
      output[index] = value & 255;
    }
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(output));
    } catch (error) {
      fail("decoded bytes are not valid UTF-8 JSON");
    }
  }

  function requestEncrypted(path) {
    var requestUrl = new URL(path, API_ORIGIN + "/");
    if (requestUrl.protocol !== "https:" || requestUrl.origin !== API_ORIGIN) fail("API URL escaped the declared origin");
    var request = new XMLHttpRequest();
    request.open("GET", requestUrl.href, false);
    request.setRequestHeader("Accept", "application/json");
    request.send(null);
    if (request.status < 200 || request.status >= 300) fail("API returned HTTP " + request.status);
    try {
      return decodeEnvelope(JSON.parse(request.responseText));
    } catch (error) {
      if (error instanceof SyntaxError) fail("API response is not JSON");
      throw error;
    }
  }

  function workSlug() {
    var match = String(location.pathname || "").match(/^\/work\/([a-z0-9-]+)\/?$/i);
    if (!match) fail("open a mapped /work/{slug} URL");
    return match[1];
  }

  function cdnUrl(value) {
    var resolved = new URL(String(value || ""), CDN_ORIGIN + "/");
    if (resolved.protocol !== "https:" || resolved.origin !== CDN_ORIGIN) fail("media URL escaped the declared CDN origin");
    return resolved.href;
  }

  function imagePage(page, workUrl) {
    if (!page || !page.imageUrl) fail("chapter contains a page without imageUrl");
    var contentType = String(page.contentType || "image/webp").toLowerCase();
    if (contentType.indexOf("image/") !== 0) fail("page contentType is not an image");
    return {
      number: String(page.number || ""),
      url: cdnUrl(page.imageUrl),
      headers: { "Referer": workUrl },
      contentType: contentType
    };
  }

  var slug = workSlug();
  var workPayload = requestEncrypted("/v1/works/" + encodeURIComponent(slug));
  var work = workPayload && workPayload.data;
  if (!work || !work.title || !Array.isArray(work.chapters) || !work.chapters.length) fail("work metadata is incomplete");
  var canonicalUrl = new URL("/work/" + encodeURIComponent(slug), location.origin).href;
  var chapters = work.chapters.map(function (chapter) {
    var id = String(chapter.id || "");
    if (!id) fail("chapter id is empty");
    return {
      id: id,
      number: String(chapter.number || ""),
      title: String(chapter.title || ("Chapter " + chapter.number)),
      label: String(chapter.title || ("Chapter " + chapter.number)),
      url: new URL("/read/" + encodeURIComponent(slug) + "/" + encodeURIComponent(id), location.origin).href,
      contentType: "images"
    };
  });
  chapters.sort(function (left, right) {
    var leftNumber = Number(left.number);
    var rightNumber = Number(right.number);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) return leftNumber - rightNumber;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
  var uniqueIds = new Set(chapters.map(function (chapter) { return chapter.id; }));
  if (uniqueIds.size !== chapters.length) fail("chapter ids are not unique");

  var initialPlan = {
    title: String(work.title),
    summary: String(work.summary || ""),
    coverUrl: work.coverImage ? cdnUrl(work.coverImage) : "",
    canonicalUrl: canonicalUrl,
    chapters: chapters
  };
  window.__nyxoviraChapterPlan = JSON.stringify(initialPlan);

  window.__nyxoviraPrepareDownloadPlan = function (context) {
    var selectedIds = context && Array.isArray(context.selectedChapterIds)
      ? context.selectedChapterIds.map(String)
      : [];
    if (!selectedIds.length) fail("no chapter id was selected");
    if (new Set(selectedIds).size !== selectedIds.length) fail("selected chapter ids are duplicated");
    var chapterPlan = context && context.chapterPlan ? context.chapterPlan : initialPlan;
    var byId = new Map(chapterPlan.chapters.map(function (chapter) { return [String(chapter.id), chapter]; }));
    var prepared = selectedIds.map(function (selectedId) {
      var original = byId.get(selectedId);
      if (!original) fail("selected chapter id was not present in the initial plan: " + selectedId);
      var payload = requestEncrypted("/v1/chapters/" + encodeURIComponent(selectedId));
      var chapter = payload && payload.data;
      if (!chapter || String(chapter.id) !== selectedId) fail("chapter API changed the selected id: " + selectedId);
      if (!Array.isArray(chapter.pages) || !chapter.pages.length) fail("chapter has no pages: " + selectedId);
      return {
        id: selectedId,
        number: String(original.number || ""),
        title: String(original.title || original.label || selectedId),
        label: String(original.label || original.title || selectedId),
        url: String(original.url),
        contentType: "images",
        pages: chapter.pages.map(function (page) { return imagePage(page, canonicalUrl); })
      };
    });
    var finalPlan = {
      title: String(chapterPlan.title || initialPlan.title),
      summary: String(chapterPlan.summary || initialPlan.summary),
      coverUrl: String(chapterPlan.coverUrl || initialPlan.coverUrl),
      canonicalUrl: String(chapterPlan.canonicalUrl || canonicalUrl),
      chapters: prepared
    };
    window.__nyxoviraChapterPlan = JSON.stringify(finalPlan);
    return finalPlan;
  };

  return canonicalUrl;
})();

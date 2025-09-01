"use strict";

function Word(id, usage, word, type, definition, definitionType) {
  this.id = id;
  this.usage = usage;
  this.word = word;
  this.type = type;
  this.definition = definition;
  this.definitionType = definitionType;
}

function notFound(str) {
  document.getElementById("content").innerHTML = `
    <div class="alert alert-warning" role="alert">
      <strong>Maalesef,</strong> bir sonuç bulamadık, kelimeyi basitleştirmeyi deneyin ya da <a href="https://www.google.com/search?q=${str}" target="_blank" ><i class="fa fa-google" aria-hidden="true"></i>oogle</a>
    </div>
  `;
  document.getElementById("loading").style.display = "none";
}

function resetSearchUI(str) {
  document.getElementById("content").innerHTML = "";
  document.getElementById("search-input").value = str;
  document.getElementById("loading").style.display = "block";
  document.getElementsByClassName("inner-shadow")[0].style.backgroundColor =
    "#BD1E2C";

  document.querySelectorAll(".pie, .dot span").forEach((el) => {
    el.style.backgroundColor =
      "#" + (((1 << 24) * Math.random()) | 0).toString(16);
  });

  return str;
}

function tureng(str) {
  str = resetSearchUI(str);

  fetch("https://tureng.com/tr/turkce-ingilizce/" + str)
    .then((response) => {
      if (!response.ok) notFound(str);
      return response.text();
    })
    .then((data) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");
      const checkSearchResults = doc.querySelectorAll(".searchResultsTable");
      const suggestionList = doc.querySelectorAll("ul.suggestion-list li");

      const contentEl = document.getElementById("content");

      if (suggestionList.length > 0 && checkSearchResults.length === 0) {
        contentEl.innerHTML = `
          <div class="list-group">
            <a href="https://www.google.com/search?q=${str}" target="_blank" class="list-group-item active">
              Bunlardan biri değilse,  <i class="fa fa-google" aria-hidden="true"></i>oogle'layın!
            </a>
          </div>
        `;

        suggestionList.forEach((li) => {
          const a = document.createElement("a");
          a.href = "#";
          a.className = "list-group-item list-group-item-action";
          a.textContent = safeResponse.cleanDomString(li.textContent.trim());
          a.addEventListener("click", () => tureng(a.textContent));
          contentEl.querySelector(".list-group").appendChild(a);
        });

        document.getElementById("voice-tts").style.display = "none";
      }

      if (checkSearchResults.length > 0) {
        checkSearchResults.forEach((table) => {
          const rows = Array.from(table.querySelectorAll("tr")).slice(1);
          const newTable = document.createElement("table");
          newTable.className = "table table-striped table-hover";
          newTable.innerHTML = `
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>${safeResponse.cleanDomString(
                  table.querySelector("tr .c2").textContent
                )}</th>
                <th>${safeResponse.cleanDomString(
                  table.querySelector("tr .c3").textContent
                )}</th>
              </tr>
            </thead>
            <tbody></tbody>
          `;
          contentEl.appendChild(newTable);

          rows.forEach((el) => {
            const tds = el.querySelectorAll("td");
            if (tds.length < 4) return;

            const translation = new Word(
              tds[0].textContent,
              tds[1].textContent.trim(),
              tds[2].querySelector("a")?.textContent.trim() || "",
              tds[2].querySelector("i")?.textContent.trim() || "",
              tds[3].querySelector("a")?.textContent.trim() || "",
              tds[3].querySelector("i")?.textContent.trim() || ""
            );

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <th scope="row" class="align-middle">${safeResponse.cleanDomString(
                translation.usage
              )}</th>
              <td><a data-href="${safeResponse.cleanDomString(
                translation.word
              )}">${safeResponse.cleanDomString(translation.word)}</a>
                ${
                  translation.type
                    ? "<small>(" +
                      safeResponse.cleanDomString(translation.type) +
                      ")</small>"
                    : ""
                }</td>
              <td><a data-href="${safeResponse.cleanDomString(
                translation.definition
              )}">${safeResponse.cleanDomString(translation.definition)}</a>
                ${
                  translation.definitionType
                    ? "<small>(" +
                      safeResponse.cleanDomString(translation.definitionType) +
                      ")</small>"
                    : ""
                }</td>
            `;
            newTable.querySelector("tbody").appendChild(tr);
          });

          newTable.querySelector("thead").addEventListener("click", (e) => {
            const tbody = newTable.querySelector("tbody");
            tbody.style.display = tbody.style.display === "none" ? "" : "none";
          });

          newTable.querySelectorAll("tbody a").forEach((a) => {
            a.addEventListener("click", (e) => {
              tureng(a.dataset.href);
            });
          });
        });

        document.getElementById("voice-tts").style.display = "block";
      }
    })
    .finally(() => {
      document.getElementById("loading").style.display = "none";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const input_field = document.getElementById("search-input");
  if (input_field) {
    setTimeout(() => {
      input_field.focus();
      input_field.select();
    }, 50);
  }

  document.getElementById("tureng").addEventListener("click", () => {
    tureng(document.getElementById("search-input").value);
  });

  document.querySelectorAll('[data-toggle="tooltip"]').forEach((el) => {
    new bootstrap.Tooltip(el);
  });
});

document
  .getElementById("search-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      tureng(document.getElementById("search-input").value);
    }
  });

// Popup açılışında seçili kelimeyi search_box'a yapıştırır, formu submit eder.
// Paste the selected word to the search_box on popup open, then submit the form.
window.onload = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let result;
  try {
    [{ result }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => getSelection().toString(),
    });
  } catch (e) {
    return;  // ignoring an unsupported page like about:addons
  }

  document.getElementById("search-input").value = result;
  if (result.length > 0) {
    document.getElementById("tureng").click();
  }
};

// TTS
const playPronunciation = async (text, lang) => {
  const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
    text
  )}&tl=${lang}`;
  const audio = new Audio(url);
  audio.crossOrigin = "anonymous";
  audio.load();

  await browser.permissions.request({
    origins: ["https://translate.google.com/*"],
  });

  await audio.play().catch((e) => log.error(logDir, "playAudio()", e, url));
};

document.getElementById("flag-tr").addEventListener("click", () => {
  playPronunciation(document.getElementById("search-input").value, "tr");
});
document.getElementById("flag-us").addEventListener("click", () => {
  playPronunciation(document.getElementById("search-input").value, "en-us");
});
document.getElementById("flag-uk").addEventListener("click", () => {
  playPronunciation(document.getElementById("search-input").value, "en-gb");
});
document.getElementById("flag-au").addEventListener("click", () => {
  playPronunciation(document.getElementById("search-input").value, "en-au");
});

document.getElementById("tureng-logo").addEventListener("click", () => {
  chrome.tabs.create({
    url:
      "http://tureng.com/tr/turkce-ingilizce/" +
      document.getElementById("search-input").value,
  });
});

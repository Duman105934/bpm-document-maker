# Сторонние компоненты и их лицензии

BPM Document Maker использует перечисленные ниже сторонние компоненты. Каждый из них распространяется
на условиях своей лицензии, а не лицензии проекта (см. файл `LICENSE`). Уведомления об авторских правах
и тексты лицензий приведены в том виде, в каком они поставляются с компонентами.

Файл собран по `package-lock.json`: в него входят все пакеты, попадающие в сборку приложения
(пакеты, нужные только для разработки и тестов, не перечислены). После обновления зависимостей его нужно обновить.

## Особые условия

- **bpmn-js** — лицензия bpmn.io: логотип bpmn.io на схеме нельзя удалять, изменять и перекрывать другими
  элементами. Полный текст — в разделе пакета `bpmn-js` ниже.
- **Шрифты PT Sans и PT Mono** (ParaType) — SIL Open Font License 1.1, полный текст в `src/assets/fonts/OFL.txt`.
  Шрифты встраиваются в PDF; продавать их отдельно от программы нельзя.

- **pako** — лицензия MIT; пакет содержит перенос библиотеки zlib (лицензия Zlib,
  (C) 1995-2013 Jean-loup Gailly and Mark Adler).
- **dompurify** — двойная лицензия MPL-2.0 или Apache-2.0; здесь используется на условиях Apache-2.0.

## Список компонентов

| Компонент | Версия | Лицензия | Источник |
|---|---|---|---|
| @babel/runtime | 7.29.14 | MIT | <https://github.com/babel/babel> |
| @bpmn-io/cm-theme | 0.2.2 | MIT | <https://github.com/bpmn-io/cm-theme> |
| @bpmn-io/diagram-js-ui | 0.2.4 | MIT | <https://github.com/bpmn-io/diagram-js-ui> |
| @bpmn-io/extract-process-variables | 2.2.1 | MIT | <https://github.com/bpmn-io/extract-process-variables> |
| @bpmn-io/feel-analyzer | 0.5.1 | MIT | <https://github.com/bpmn-io/feel-analyzer> |
| @bpmn-io/feel-editor | 2.8.1 | MIT | <https://github.com/bpmn-io/feel-editor> |
| @bpmn-io/feel-lint | 3.2.0 | MIT | <https://github.com/bpmn-io/feel-lint> |
| @bpmn-io/feelers-editor | 1.2.0 | MIT | <https://github.com/bpmn-io/feelers> |
| @bpmn-io/feelers-lint | 1.0.0 | MIT | <https://github.com/bpmn-io/feelers> |
| @bpmn-io/lang-feel | 4.0.2 | MIT | <https://github.com/bpmn-io/lang-feel> |
| @bpmn-io/lang-feelers | 1.0.0 | MIT | <https://github.com/bpmn-io/feelers> |
| @bpmn-io/lezer-feel | 3.0.1 | MIT | <https://github.com/bpmn-io/lezer-feel> |
| @bpmn-io/lezer-feelers | 1.0.0 | MIT | <https://github.com/bpmn-io/feelers> |
| @bpmn-io/properties-panel | 3.59.0 | MIT | <https://github.com/bpmn-io/properties-panel> |
| @bpmn-io/semver-compat | 0.1.0 | MIT | <https://github.com/bpmn-io/semver-compat> |
| @camunda/feel-builtins | 1.5.0 | MIT | <https://github.com/camunda/feel-builtins> |
| @codemirror/autocomplete | 6.20.4 | MIT | <https://code.haverbeke.berlin/codemirror/autocomplete> |
| @codemirror/commands | 6.11.1 | MIT | <https://code.haverbeke.berlin/codemirror/commands> |
| @codemirror/lang-json | 6.0.2 | MIT | <https://github.com/codemirror/lang-json> |
| @codemirror/language | 6.13.1 | MIT | <https://code.haverbeke.berlin/codemirror/language> |
| @codemirror/lint | 6.9.8 | MIT | <https://code.haverbeke.berlin/codemirror/lint> |
| @codemirror/state | 6.7.6 | MIT | <https://code.haverbeke.berlin/codemirror/state> |
| @codemirror/streamparser | 6.0.0 | MIT | <https://code.haverbeke.berlin/codemirror/streamparser> |
| @codemirror/view | 6.43.15 | MIT | <https://code.haverbeke.berlin/codemirror/view> |
| @lezer/common | 1.5.5 | MIT | <https://code.haverbeke.berlin/lezer/common> |
| @lezer/highlight | 1.2.5 | MIT | <https://code.haverbeke.berlin/lezer/highlight> |
| @lezer/html | 1.3.13 | MIT | <https://github.com/lezer-parser/html> |
| @lezer/json | 1.0.3 | MIT | <https://github.com/lezer-parser/json> |
| @lezer/lr | 1.4.12 | MIT | <https://code.haverbeke.berlin/lezer/lr> |
| @lezer/markdown | 1.8.1 | MIT | <https://code.haverbeke.berlin/lezer/markdown> |
| @marijn/find-cluster-break | 1.0.4 | MIT | <https://code.haverbeke.berlin/marijn/find-cluster-break> |
| @types/d3-color | 3.1.3 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/d3-drag | 3.0.7 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/d3-interpolate | 3.0.4 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/d3-selection | 3.0.12 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/d3-transition | 3.0.9 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/d3-zoom | 3.0.9 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/pako | 2.0.4 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/raf * | 3.4.3 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/react | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/react-dom | 19.3.0 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @types/trusted-types * | 2.0.7 | MIT | <https://github.com/DefinitelyTyped/DefinitelyTyped> |
| @xyflow/react | 12.12.1 | MIT | <https://github.com/xyflow/xyflow> |
| @xyflow/system | 0.0.84 | MIT | <https://github.com/xyflow/xyflow> |
| array-move | 4.0.0 | MIT | <https://github.com/sindresorhus/array-move> |
| base64-arraybuffer * | 1.0.2 | MIT | <https://github.com/niklasvh/base64-arraybuffer> |
| bpmn-js | 18.31.1 | SEE LICENSE IN LICENSE | <https://github.com/bpmn-io/bpmn-js> |
| bpmn-js-create-append-anything | 2.2.0 | MIT | <https://github.com/bpmn-io/bpmn-js-create-append-anything> |
| bpmn-js-properties-panel | 5.65.3 | MIT | <https://github.com/bpmn-io/bpmn-js-properties-panel> |
| bpmn-moddle | 10.3.1 | MIT | <https://github.com/bpmn-io/bpmn-moddle> |
| camunda-bpmn-js-behaviors | 1.18.0 | MIT | <https://github.com/camunda/camunda-bpmn-js-behaviors> |
| camunda-bpmn-moddle | 8.0.2 | MIT | <https://github.com/camunda/camunda-bpmn-moddle> |
| canvg * | 3.0.11 | MIT | <https://github.com/canvg/canvg> |
| classcat | 5.0.5 | MIT | <https://github.com/jorgebucaran/classcat> |
| classnames | 2.5.1 | MIT | <https://github.com/JedWatson/classnames> |
| clsx | 2.1.1 | MIT | <https://github.com/lukeed/clsx> |
| core-js * | 3.51.0 | MIT | <https://github.com/zloirock/core-js> |
| crelt | 1.0.7 | MIT | <https://code.haverbeke.berlin/marijn/crelt> |
| css-line-break * | 2.1.0 | MIT | <ssh://git@github.com/niklasvh/css-line-break> |
| cssesc | 3.0.0 | MIT | <https://github.com/mathiasbynens/cssesc> |
| csstype | 3.2.3 | MIT | <https://github.com/frenic/csstype> |
| d3-color | 3.1.1 | ISC | <https://github.com/d3/d3-color> |
| d3-dispatch | 3.0.2 | ISC | <https://github.com/d3/d3-dispatch> |
| d3-drag | 3.0.1 | ISC | <https://github.com/d3/d3-drag> |
| d3-ease | 3.0.2 | BSD-3-Clause | <https://github.com/d3/d3-ease> |
| d3-interpolate | 3.0.2 | ISC | <https://github.com/d3/d3-interpolate> |
| d3-selection | 3.0.1 | ISC | <https://github.com/d3/d3-selection> |
| d3-timer | 3.0.2 | ISC | <https://github.com/d3/d3-timer> |
| d3-transition | 3.0.2 | ISC | <https://github.com/d3/d3-transition> |
| d3-zoom | 3.0.1 | ISC | <https://github.com/d3/d3-zoom> |
| diagram-js | 15.29.1 | MIT | <https://github.com/bpmn-io/diagram-js> |
| diagram-js-direct-editing | 3.6.0 | MIT | <https://github.com/bpmn-io/diagram-js-direct-editing> |
| didi | 12.0.0 | MIT | <https://github.com/nikku/didi> |
| domify | 3.0.0 | MIT | <https://github.com/sindresorhus/domify> |
| dompurify * | 3.4.18 | (MPL-2.0 OR Apache-2.0) | <https://github.com/cure53/DOMPurify> |
| fast-png | 6.4.0 | MIT | <https://github.com/image-js/fast-png> |
| fflate | 0.8.3 | MIT | <https://github.com/101arrowz/fflate> |
| focus-trap | 8.2.5 | MIT | <https://github.com/focus-trap/focus-trap> |
| font-family-papandreou | 0.2.0-patch2 | MIT | <https://github.com/hanamura/font-family> |
| htm | 3.1.1 | Apache-2.0 | <https://github.com/developit/htm> |
| html2canvas * | 1.4.1 | MIT | <git@github.com:niklasvh/html2canvas> |
| idb-keyval | 6.3.0 | Apache-2.0 | <https://github.com/jakearchibald/idb-keyval> |
| ids | 3.0.2 | MIT | <https://github.com/bpmn-io/ids> |
| inherits-browser | 0.1.0 | ISC | <https://github.com/nikku/inherits-browser> |
| iobuffer | 5.4.0 | MIT | <https://github.com/image-js/iobuffer> |
| jspdf | 4.2.1 | MIT | <https://github.com/parallax/jsPDF> |
| min-dash | 5.1.0 | MIT | <https://github.com/bpmn-io/min-dash> |
| min-dom | 5.3.0 | MIT | <https://github.com/bpmn-io/min-dom> |
| mitt | 3.0.1 | MIT | <https://github.com/developit/mitt> |
| moddle | 8.2.1 | MIT | <https://github.com/bpmn-io/moddle> |
| moddle-xml | 12.3.2 | MIT | <https://github.com/bpmn-io/moddle-xml> |
| object-refs | 0.4.0 | MIT | <https://github.com/bpmn-io/object-refs> |
| pako | 2.2.0 | (MIT AND Zlib) | <https://github.com/nodeca/pako> |
| path-intersection | 4.2.1 | MIT | <https://github.com/bpmn-io/path-intersection> |
| performance-now * | 2.1.0 | MIT | <https://github.com/braveg1rl/performance-now> |
| preact | 10.29.8 | MIT | <https://github.com/preactjs/preact> |
| raf * | 3.4.1 | MIT | <https://github.com/chrisdickinson/raf> |
| react | 19.3.1 | MIT | <https://github.com/react/react> |
| react-dom | 19.3.1 | MIT | <https://github.com/react/react> |
| regenerator-runtime * | 0.13.11 | MIT | <https://github.com/facebook/regenerator/tree/main/packages/runtime> |
| rgbcolor * | 1.0.1 | MIT OR SEE LICENSE IN FEEL-FREE.md | <https://github.com/yetzt/node-rgbcolor> |
| saxen | 11.2.0 | MIT | <https://github.com/nikku/saxen> |
| scheduler | 0.28.0 | MIT | <https://github.com/react/react> |
| semver | 7.8.6 | ISC | <https://github.com/npm/node-semver> |
| specificity | 0.4.1 | MIT | <https://github.com/keeganstreet/specificity> |
| stackblur-canvas * | 2.7.0 | MIT | <https://github.com/flozz/StackBlur> |
| style-mod | 4.1.4 | MIT | <https://code.haverbeke.berlin/marijn/style-mod> |
| svg-pathdata * | 6.0.3 | MIT | <https://github.com/nfroidure/svg-pathdata> |
| svg2pdf.js | 2.9.0 | MIT | <https://github.com/yWorks/svg2pdf.js> |
| svgpath | 2.6.0 | MIT | <https://github.com/fontello/svgpath> |
| tabbable | 6.5.2 | MIT | <https://github.com/focus-trap/tabbable> |
| text-segmentation * | 1.0.3 | MIT | <ssh://git@github.com/niklasvh/text-segmentation> |
| tiny-svg | 4.1.4 | MIT | <https://github.com/bpmn-io/tiny-svg> |
| use-sync-external-store | 1.7.0 | MIT | <https://github.com/react/react> |
| utrie * | 1.0.2 | MIT | <ssh://git@github.com/niklasvh/utrie> |
| w3c-keyname | 2.2.8 | MIT | <https://github.com/marijnh/w3c-keyname> |
| zeebe-bpmn-moddle | 2.0.0 | MIT | <https://github.com/camunda/zeebe-bpmn-moddle> |
| zundo | 2.3.0 | MIT | <https://github.com/charkour/zundo> |
| zustand | 4.5.7 | MIT | <https://github.com/pmndrs/zustand> |
| zustand | 5.1.0 | MIT | <https://github.com/pmndrs/zustand> |
| PT Sans (Regular, Bold) | — | OFL-1.1 | <https://www.paratype.com/public> |
| PT Mono (Regular) | 1.001 | OFL-1.1 | <https://www.paratype.com/public> |

\* необязательная зависимость `jspdf`; загружается только при использовании соответствующей возможности.

## Тексты лицензий

### 1. MIT — пакетов: 34

- **@babel/runtime** 7.29.14 — Copyright (c) 2014-present Sebastian McKenzie and other contributors
- **@bpmn-io/lang-feel** 4.0.2 — Copyright (C) 2022-current Nico Rehwaldt <https://github.com/nikku>
- **@bpmn-io/lezer-feel** 3.0.1 — Copyright (C) 2020 by Nico Rehwaldt <git_nikku@nixis.de> and others
- **@codemirror/autocomplete** 6.20.4 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/commands** 6.11.1 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/lang-json** 6.0.2 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/language** 6.13.1 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/lint** 6.9.8 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/state** 6.7.6 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/streamparser** 6.0.0 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@codemirror/view** 6.43.15 — Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@lezer/common** 1.5.5 — Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@lezer/highlight** 1.2.5 — Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@lezer/html** 1.3.13 — Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@lezer/json** 1.0.3 — Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin>, Arun Srinivasan <rulfzid@gmail.com>, and others
- **@lezer/lr** 1.4.12 — Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@lezer/markdown** 1.8.1 — Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **@marijn/find-cluster-break** 1.0.4 — Copyright (C) 2024 by Marijn Haverbeke <marijn@haverbeke.berlin>
- **@xyflow/react** 12.12.1 — Copyright (c) 2019-2025 webkid GmbH
- **@xyflow/system** 0.0.84 — Copyright (c) 2019-2025 webkid GmbH
- **array-move** 4.0.0 — Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
- **clsx** 2.1.1 — Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
- **domify** 3.0.0 — Copyright (c) TJ Holowaychuk <tj@tjholowaychuk.com>; Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
- **fast-png** 6.4.0 — Copyright (c) 2015 Michaël Zasso
- **fflate** 0.8.3 — Copyright (c) 2026 Arjun Barrett
- **mitt** 3.0.1 — Copyright (c) 2021 Jason Miller
- **react** 19.3.1 — Copyright (c) Meta Platforms, Inc. and affiliates.
- **react-dom** 19.3.1 — Copyright (c) Meta Platforms, Inc. and affiliates.
- **regenerator-runtime** 0.13.11 — Copyright (c) 2014-present, Facebook, Inc.
- **scheduler** 0.28.0 — Copyright (c) Meta Platforms, Inc. and affiliates.
- **use-sync-external-store** 1.7.0 — Copyright (c) Meta Platforms, Inc. and affiliates.
- **zundo** 2.3.0 — Copyright (c) 2021 Charles Kornoelje
- **zustand** 4.5.7 — Copyright (c) 2019 Paul Henschel
- **zustand** 5.1.0 — Copyright (c) 2019 Paul Henschel

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### 2. MIT — пакетов: 34

- **@bpmn-io/cm-theme** 0.2.2 — Copyright (c) 2024-present Camunda Services GmbH
- **@bpmn-io/diagram-js-ui** 0.2.4 — Copyright (c) 2022-present Camunda Services GmbH
- **@bpmn-io/extract-process-variables** 2.2.1 — Copyright (c) 2020-present Camunda Services GmbH
- **@bpmn-io/feel-analyzer** 0.5.1 — Copyright (c) 2026 Camunda Services GmbH
- **@bpmn-io/feel-editor** 2.8.1 — Copyright (c) 2015 camunda Services GmbH
- **@bpmn-io/feel-lint** 3.2.0 — Copyright (c) 2022 camunda Services GmbH
- **@bpmn-io/properties-panel** 3.59.0 — Copyright (c) 2021-present Camunda Services GmbH
- **@camunda/feel-builtins** 1.5.0 — Copyright (c) 2025-present Camunda Services GmbH
- **bpmn-js-create-append-anything** 2.2.0 — Copyright (c) 2023-present Camunda Services GmbH
- **bpmn-js-properties-panel** 5.65.3 — Copyright (c) 2015 camunda Services GmbH
- **bpmn-moddle** 10.3.1 — Copyright (c) 2014 camunda Services GmbH
- **camunda-bpmn-js-behaviors** 1.18.0 — Copyright (c) 2022-present Camunda Services GmbH
- **camunda-bpmn-moddle** 8.0.2 — Copyright (c) 2014-2017 camunda Services GmbH
- **canvg** 3.0.11 — Copyright (c) 2010 - present Gabe Lerner (gabelerner@gmail.com) - https://github.com/canvg/canvg
- **classnames** 2.5.1 — Copyright (c) 2018 Jed Watson
- **diagram-js** 15.29.1 — Copyright (c) 2014-present Camunda Services GmbH
- **diagram-js-direct-editing** 3.6.0 — Copyright (c) 2014-2017 camunda Services GmbH
- **focus-trap** 8.2.5 — Copyright (c) 2015-2016 David Clark
- **font-family-papandreou** 0.2.0-patch2 — Copyright (c) 2015 Taro Hanamura
- **ids** 3.0.2 — Copyright (c) 2014 camunda Services GmbH
- **iobuffer** 5.4.0 — Copyright (c) 2015 Michaël Zasso
- **min-dash** 5.1.0 — Copyright (c) 2017-present camunda Services GmbH
- **min-dom** 5.3.0 — Copyright (c) 2014 Nico Rehwaldt; Copyright (c) 2015-present camunda Services GmbH
- **moddle** 8.2.1 — Copyright (c) 2014-present Camunda Services GmbH
- **moddle-xml** 12.3.2 — Copyright (c) 2014-present Camunda Services GmbH
- **object-refs** 0.4.0 — Copyright (c) 2014-present camunda Services GmbH
- **path-intersection** 4.2.1 — Copyright (c) 2017 camunda Services GmbH
- **preact** 10.29.8 — Copyright (c) 2015-present Jason Miller
- **saxen** 11.2.0 — Copyright (c) 2012 Vopilovskii Konstantin   <flash.vkv@gmail.com>; Copyright (c) 2017-present Nico Rehwaldt
- **specificity** 0.4.1 — Copyright (c) 2016 Keegan Street and others
- **svg2pdf.js** 2.9.0 — Copyright (c) 2015-2026 yWorks GmbH; Copyright (c) 2013-2015 by Vitaly Puzrin
- **tabbable** 6.5.2 — Copyright (c) 2015 David Clark
- **tiny-svg** 4.1.4 — Copyright (c) 2014 Nico Rehwaldt; Copyright (c) 2015-present camunda Services GmbH
- **zeebe-bpmn-moddle** 2.0.0 — Copyright (c) 2020-present Camunda Services GmbH

```text
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### 3. MIT — пакетов: 19

- **@bpmn-io/feelers-editor** 1.2.0 — Copyright (c) 2023-present Camunda Services GmbH
- **@bpmn-io/feelers-lint** 1.0.0 — Copyright (c) 2023-present Camunda Services GmbH
- **@bpmn-io/lang-feelers** 1.0.0 — Copyright (c) 2023-present Camunda Services GmbH
- **@bpmn-io/lezer-feelers** 1.0.0 — Copyright (c) 2023-present Camunda Services GmbH
- **base64-arraybuffer** 1.0.2 — Copyright (c) 2012 Niklas von Hertzen
- **core-js** 3.51.0 — Copyright (c) 2013–2025 Denis Pushkarev (zloirock.ru); Copyright (c) 2025–2026 CoreJS Company (core-js.io)
- **crelt** 1.0.7 — Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin>
- **css-line-break** 2.1.0 — Copyright (c) 2017 Niklas von Hertzen
- **cssesc** 3.0.0 — Copyright Mathias Bynens <https://mathiasbynens.be/>
- **csstype** 3.2.3 — Copyright (c) 2017-2018 Fredrik Nicol
- **html2canvas** 1.4.1 — Copyright (c) 2012 Niklas von Hertzen
- **jspdf** 4.2.1 — Copyright; (c) 2010-2025 James Hall, https://github.com/MrRio/jsPDF; (c) 2015-2025 yWorks GmbH, https://www.yworks.com/
- **performance-now** 2.1.0 — Copyright (c) 2013 Braveg1rl
- **raf** 3.4.1 — Copyright 2013 Chris Dickinson <chris@neversaw.us>
- **stackblur-canvas** 2.7.0 — Copyright (c) 2010 Mario Klingemann
- **style-mod** 4.1.4 — Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
- **text-segmentation** 1.0.3 — Copyright (c) 2021 Niklas von Hertzen
- **utrie** 1.0.2 — Copyright (c) 2021 Niklas von Hertzen
- **w3c-keyname** 2.2.8 — Copyright (C) 2016 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

```text
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software  is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
```

### 4. MIT — пакетов: 11

- **@types/d3-color** 3.1.3 — Copyright (c) Microsoft Corporation.
- **@types/d3-drag** 3.0.7 — Copyright (c) Microsoft Corporation.
- **@types/d3-interpolate** 3.0.4 — Copyright (c) Microsoft Corporation.
- **@types/d3-selection** 3.0.12 — Copyright (c) Microsoft Corporation.
- **@types/d3-transition** 3.0.9 — Copyright (c) Microsoft Corporation.
- **@types/d3-zoom** 3.0.9 — Copyright (c) Microsoft Corporation.
- **@types/pako** 2.0.4 — Copyright (c) Microsoft Corporation.
- **@types/raf** 3.4.3 — Copyright (c) Microsoft Corporation.
- **@types/react** 19.3.0 — Copyright (c) Microsoft Corporation.
- **@types/react-dom** 19.3.0 — Copyright (c) Microsoft Corporation.
- **@types/trusted-types** 2.0.7 — Copyright (c) Microsoft Corporation.

```text
MIT License

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE
```

### 5. ISC — пакетов: 8

- **d3-color** 3.1.1 — Copyright 2010-2026 Mike Bostock
- **d3-dispatch** 3.0.2 — Copyright 2010-2026 Mike Bostock
- **d3-drag** 3.0.1 — Copyright 2010-2026 Mike Bostock
- **d3-interpolate** 3.0.2 — Copyright 2010-2026 Mike Bostock
- **d3-selection** 3.0.1 — Copyright 2010-2026 Mike Bostock
- **d3-timer** 3.0.2 — Copyright 2010-2026 Mike Bostock
- **d3-transition** 3.0.2 — Copyright 2010-2026 Mike Bostock
- **d3-zoom** 3.0.1 — Copyright 2010-2026 Mike Bostock

```text
Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### 6. ISC — пакетов: 2

- **inherits-browser** 0.1.0 — Copyright (c) 2022-present Nico Rehwaldt; Copyright (c) 2011-2022 Isaac Z. Schlueter
- **semver** 7.8.6 — Copyright (c) Isaac Z. Schlueter and Contributors

```text
The ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

### 7. (MIT AND Zlib), MIT — пакетов: 2

- **pako** 2.2.0 — Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn
- **svgpath** 2.6.0 — Copyright (C) 2013-2015 by Vitaly Puzrin

```text
(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### 8. MIT — @bpmn-io/semver-compat

- **@bpmn-io/semver-compat** 0.1.0

Пакет не содержит файла лицензии; лицензия указана в его `package.json`: MIT.

### 9. SEE LICENSE IN LICENSE — bpmn-js

- **bpmn-js** 18.31.1 — Copyright (c) 2014-present Camunda Services GmbH

```text
Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The source code responsible for displaying the bpmn.io project watermark that
links back to https://bpmn.io as part of rendered diagrams MUST NOT be
removed or changed. When this software is being used in a website or application,
the watermark must stay fully visible and not visually overlapped by other elements.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
```

### 10. MIT — classcat

- **classcat** 5.0.5 — Copyright © Jorge Bucaran <<https://jorgebucaran.com>>

```text
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### 11. BSD-3-Clause — d3-ease

- **d3-ease** 3.0.2 — Copyright 2010-2026 Mike Bostock; Copyright 2001 Robert Penner

```text
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the author nor the names of contributors may be used to
  endorse or promote products derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### 12. MIT — didi

- **didi** 12.0.0 — Copyright (C) 2013 Vojta Jína.; Copyright (C) 2015-present Nico Rehwaldt.

```text
The MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### 13. (MPL-2.0 OR Apache-2.0) — dompurify

- **dompurify** 3.4.18

```text
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### 14. Apache-2.0 — htm

- **htm** 3.1.1 — Copyright 2018 Google Inc.

```text
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

### 15. Apache-2.0 — idb-keyval

- **idb-keyval** 6.3.0 — Copyright 2016, Jake Archibald

```text
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

### 16. MIT OR SEE LICENSE IN FEEL-FREE.md — rgbcolor

- **rgbcolor** 1.0.1 — Copyright (c) 2016 Stoyan Stefanov, http://phpied.com/

```text
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Exemptions
==========

Please either apply this, the MIT license, or the license in './FEEL-FREE.md'
```

### 17. MIT — svg-pathdata

- **svg-pathdata** 6.0.3 — Copyright © 2017 Nicolas Froidure

```text
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

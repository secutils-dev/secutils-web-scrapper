import * as assert from 'node:assert';
import { Blob } from 'node:buffer';
import { test } from 'node:test';

import { registerResourcesListRoutes } from './list.js';
import { createBrowserMock, createPageMock, createResponseMock, createWindowMock } from '../../mocks.js';
import { createMock } from '../api_route_params.mocks.js';

await test('[/api/resources] can successfully create route', () => {
  assert.doesNotThrow(() => registerResourcesListRoutes(createMock()));
});

await test('[/api/resources] can parse resources', async (t) => {
  t.mock.method(Date, 'now', () => 123000);

  const windowMock = createWindowMock();
  windowMock.document.querySelectorAll.mock.mockImplementation((selector: string) => {
    if (selector === 'script') {
      const blobScript = new Blob(['console.log(1);alert(2);alert(3);alert(4);alert(5);console.log(6);']);
      return [
        { src: 'https://secutils.dev/script.js', innerHTML: '' },
        { src: 'https://secutils.dev/script.js', innerHTML: '' },
        { src: '', innerHTML: 'alert(1);alert(2);alert(3);alert(4);alert(5);console.log(6);' },
        { src: '', innerHTML: 'alert(1)' },
        { src: '', innerHTML: 'alert(1)'.repeat(33) },
        {
          src: 'data:text/javascript;base64,YWxlcnQoMSk7YWxlcnQoMik7YWxlcnQoMyk7YWxlcnQoNCk7YWxlcnQoNSk7Y29uc29sZS5sb2coNik7',
          onload: { toString: () => 'alert(2)' },
          innerHTML: '',
        },
        { src: 'https://secutils.dev/weird-script.js', innerHTML: 'alert(1)' },
        // @ts-expect-error: Conflicting types with DOM.
        { src: URL.createObjectURL(blobScript), innerHTML: '' },
      ];
    }

    if (selector === 'link[rel=stylesheet]') {
      const blobStyle = new Blob(['body { background-color: blue } div { color: red }']);
      return [
        { href: 'https://secutils.dev/style.css' },
        { href: 'https://secutils.dev/fonts.css' },
        { href: 'data:text/css, body { background-color: red } div { color: green }' },
        // @ts-expect-error: Conflicting types with DOM.
        { href: URL.createObjectURL(blobStyle) },
      ];
    }

    if (selector === 'style') {
      return [
        { innerHTML: '* { color: black; background-color: white; font-size: 100; }' },
        { innerHTML: `* { ${'a'.repeat(50)} }` },
        { innerHTML: `* {}` },
      ];
    }

    return [];
  });

  const pageMock = createPageMock({
    window: windowMock,
    responses: [
      createResponseMock({
        url: 'https://secutils.dev/script.js',
        body: 'window.document.body.innerHTML = "Hello Secutils.dev and world!";',
        resourceType: 'script',
      }),
      createResponseMock({
        url: 'https://secutils.dev/weird-script.js',
        body: `window.document.body.innerHTML = "Hello Secutils.dev and world!";`,
        resourceType: 'script',
      }),
      createResponseMock({
        url: 'https://secutils.dev/fonts.css',
        body: '* { color: blue-ish-not-valid; font-size: 100500; }',
        resourceType: 'stylesheet',
      }),
    ],
  });

  const response = await registerResourcesListRoutes(createMock({ browser: createBrowserMock(pageMock) })).inject({
    method: 'POST',
    url: '/api/resources',
    payload: { url: 'https://secutils.dev', delay: 0 },
  });

  assert.strictEqual(response.statusCode, 200);

  assert.strictEqual(
    response.body,
    JSON.stringify({
      timestamp: 123,
      scripts: [
        {
          url: 'https://secutils.dev/script.js',
          content: {
            data: { type: 'tlsh', value: 'T156A002B39256197413252E602EA57AC67D66540474113459D79DB004B1608C7C8EEEDD' },
            size: 65,
          },
        },
        {
          url: 'https://secutils.dev/script.js',
          content: {
            data: { type: 'tlsh', value: 'T156A002B39256197413252E602EA57AC67D66540474113459D79DB004B1608C7C8EEEDD' },
            size: 65,
          },
        },
        {
          content: {
            data: { type: 'tlsh', value: 'T172A0021519C40C242F86775C090C100124801A5170435C46500D52FE00557F2807D114' },
            size: 60,
          },
        },
        {
          content: {
            data: { type: 'raw', value: 'alert(1)' },
            size: 8,
          },
        },
        {
          content: {
            data: { type: 'sha1', value: 'eeb57986d46355a4ccfab37c3071f40e2b14ab07' },
            size: 264,
          },
        },
        {
          url: 'data:text/javascript;base64,[T1B7B0920E581F5C01C2C0128830FCB23897382835A00C4A57783C7BD4344CA70280F388]',
          content: {
            data: { type: 'tlsh', value: 'T1B7B0920E581F5C01C2C0128830FCB23897382835A00C4A57783C7BD4344CA70280F388' },
            size: 116,
          },
        },
        {
          url: 'https://secutils.dev/weird-script.js',
          content: {
            data: { type: 'tlsh', value: 'T196A022F3A2020E3003222F202EA83AC23C2200083020300AC38CF000B0308C3C8EEECC' },
            size: 73,
          },
        },
        {
          url: 'blob:[T1D8A002151DC80C343F85775C0D0C500234801F55B0836C45600D17FF0095FF284BD128]',
          content: {
            data: { type: 'tlsh', value: 'T1D8A002151DC80C343F85775C0D0C500234801F55B0836C45600D17FF0095FF284BD128' },
            size: 66,
          },
        },
      ],
      styles: [
        { url: 'https://secutils.dev/style.css' },
        {
          url: 'https://secutils.dev/fonts.css',
          content: {
            data: { type: 'tlsh', value: 'T19590220E23308028C000888020033280308C008300000328208008C0808CCE02200B00' },
            size: 51,
          },
        },
        {
          url: 'data:text/css,[T110A02222C3020C0330CB800FA0B2800B8A32088880382FE83C38C02C020E00020238FA]',
          content: {
            data: { type: 'tlsh', value: 'T110A02222C3020C0330CB800FA0B2800B8A32088880382FE83C38C02C020E00020238FA' },
            size: 66,
          },
        },
        {
          url: 'blob:[T19F900206CA51495B759B81595461850B423A11C954786B18786A55980615454A1224F1]',
          content: {
            data: { type: 'tlsh', value: 'T19F900206CA51495B759B81595461850B423A11C954786B18786A55980615454A1224F1' },
            size: 50,
          },
        },
        {
          content: {
            data: { type: 'tlsh', value: 'T13DA0021ADB65454A32DF5A68356397A0526D548889104B7C3D5EB894D74C0617112791' },
            size: 60,
          },
        },
        {
          content: {
            data: { type: 'raw', value: '* { aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa }' },
            size: 56,
          },
        },
        {
          content: {
            data: { type: 'raw', value: '* {}' },
            size: 4,
          },
        },
      ],
    }),
  );

  // Make sure we loaded correct page.
  assert.strictEqual(pageMock.goto.mock.callCount(), 1);
  assert.deepEqual(pageMock.goto.mock.calls[0].arguments, [
    'https://secutils.dev',
    { waitUntil: 'domcontentloaded', timeout: 5000 },
  ]);

  // Make sure we didn't wait for a selector since it wasn't specified.
  assert.strictEqual(pageMock.waitForSelector.mock.callCount(), 0);
});

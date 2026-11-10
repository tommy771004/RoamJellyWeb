import test from 'node:test';
import assert from 'node:assert/strict';
import { responsiveImageProps, sizedImageUrl } from './imageUrl';

const UNSPLASH = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop';

test('sizedImageUrl rewrites width and quality on Unsplash URLs', () => {
  const out = new URL(sizedImageUrl(UNSPLASH, 160));
  assert.equal(out.searchParams.get('w'), '160');
  assert.equal(out.searchParams.get('q'), '60');
  assert.equal(out.searchParams.get('auto'), 'format');
  assert.equal(out.searchParams.get('fit'), 'crop');
  assert.equal(out.pathname, '/photo-1508009603885-50cf7c579365');
});

test('sizedImageUrl overrides an existing q param', () => {
  const out = new URL(sizedImageUrl('https://images.unsplash.com/photo-1?auto=format&fit=crop&q=80&w=300', 120));
  assert.equal(out.searchParams.get('q'), '60');
  assert.equal(out.searchParams.get('w'), '120');
});

test('non-Unsplash and malformed URLs pass through unchanged', () => {
  for (const url of ['https://example.com/a.jpg?w=800', '/local/cover.png', 'not a url', '']) {
    assert.equal(sizedImageUrl(url, 200), url);
    assert.deepEqual(responsiveImageProps(url, [200, 400], '200px'), { src: url });
  }
});

test('aspect adds a matching h param so object-cover slots are covered', () => {
  const out = new URL(sizedImageUrl(UNSPLASH, 300, 60, 1.5));
  assert.equal(out.searchParams.get('w'), '300');
  assert.equal(out.searchParams.get('h'), '450');
  assert.equal(out.searchParams.get('fit'), 'crop');
  const props = responsiveImageProps(UNSPLASH, [160, 300], '128px', 1.5);
  const sizes = props.srcSet!.split(', ').map((entry) => {
    const [href, descriptor] = entry.split(' ');
    const u = new URL(href);
    return `${u.searchParams.get('w')}x${u.searchParams.get('h')} ${descriptor}`;
  });
  assert.deepEqual(sizes, ['160x240 160w', '300x450 300w']);
});

test('without aspect any stored h param is dropped (width-only sizing)', () => {
  const out = new URL(sizedImageUrl('https://images.unsplash.com/photo-1?w=800&h=600&fit=crop', 200));
  assert.equal(out.searchParams.get('h'), null);
});

test('responsiveImageProps builds an ascending srcset with the smallest as src', () => {
  const props = responsiveImageProps(UNSPLASH, [280, 160], '(min-width: 640px) 140px, 110px');
  assert.equal(new URL(props.src).searchParams.get('w'), '160');
  const entries = props.srcSet!.split(', ');
  assert.equal(entries.length, 2);
  assert.match(entries[0], /w=160.* 160w$/);
  assert.match(entries[1], /w=280.* 280w$/);
  assert.equal(props.sizes, '(min-width: 640px) 140px, 110px');
});

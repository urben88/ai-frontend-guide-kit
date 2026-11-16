import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, scanText } from '../ai-frontend-guide-kit/tools/audit-honesty.mjs';

// The anti-manipulation rules of the applied-psychology list (S12) that can be seen in source text.

const rulesOf = (text) => new Set(scanText(text).map((finding) => finding.rule));
const severityOf = (text, rule) => scanText(text).find((finding) => finding.rule === rule)?.severity;

test('countdown-timer: a countdown component or a hand-written ticking time is flagged (medium); an ordinary time is not', () => {
  assert.ok(rulesOf('<Countdown to={saleEnd} />').has('countdown-timer'));
  assert.ok(rulesOf('<p>Offer ends 02:59:59</p>').has('countdown-timer'));
  assert.ok(rulesOf('<span>00:14:09 left</span>').has('countdown-timer'));
  assert.equal(severityOf('<Countdown to={saleEnd} />', 'countdown-timer'), 'medium');
  assert.ok(!rulesOf('<p>Posted at 10:30 by Ana</p>').has('countdown-timer'));
});

test('fomo-activity: "people viewing", "selling fast" and "bought in the last hour" copy is flagged (medium)', () => {
  for (const line of ['<p>14 people are viewing this right now</p>', '<p>Selling fast</p>', '<p>Almost sold out</p>', '<p>Bought 9 times in the last hour</p>', '<p>In high demand</p>']) {
    assert.ok(rulesOf(line).has('fomo-activity'), line);
  }
  assert.equal(severityOf('<p>Selling fast</p>', 'fomo-activity'), 'medium');
  assert.ok(!rulesOf('<p>People who viewed the guide also read the FAQ</p>').has('fomo-activity'));
});

test('hard-cancel: cancelling only by phone, email or contact is flagged (medium); cancelling from the account is not', () => {
  assert.ok(rulesOf('<p>To cancel, call our support line</p>').has('hard-cancel'));
  assert.ok(rulesOf('<p>Cancellations: email billing@example.com</p>').has('hard-cancel'));
  assert.equal(severityOf('<p>Call us to cancel</p>', 'hard-cancel'), 'medium');
  assert.ok(!rulesOf('<p>Cancel any time from your account page</p>').has('hard-cancel'));
});

test('subscription-no-cancel: a file that sells a subscription or trial and never says cancel is flagged (medium)', () => {
  assert.ok(rulesOf('<p>Start your free trial. Then $9/month</p>').has('subscription-no-cancel'));
  assert.equal(severityOf('<p>Subscribe for $9 per month</p>', 'subscription-no-cancel'), 'medium');
  assert.ok(!rulesOf('<p>Start your free trial. Then $9/month</p><p>Cancel any time in one click</p>').has('subscription-no-cancel'));
  assert.ok(!rulesOf('<p>About our bakery</p>').has('subscription-no-cancel'));
});

test('tiny-decline: a reject or decline option styled small or faded is flagged (medium); a plain one is not', () => {
  assert.ok(rulesOf('<button className="text-xs opacity-40">Reject all</button>').has('tiny-decline'));
  assert.ok(rulesOf('<a style="font-size: 10px" href="#">No thanks</a>').has('tiny-decline'));
  assert.equal(severityOf('<button className="text-xs">Decline</button>', 'tiny-decline'), 'medium');
  assert.ok(!rulesOf('<button className="btn">Reject all</button>').has('tiny-decline'));
  assert.ok(!rulesOf('<button className="text-xs">Save</button>').has('tiny-decline'));
});

test('hidden-fee: copy that adds a booking, service, processing or handling fee is flagged (medium); "no fee" is not', () => {
  assert.ok(rulesOf('<p>A service fee is added at checkout</p>').has('hidden-fee'));
  assert.ok(rulesOf('<p>Plus a processing fee of 3%</p>').has('hidden-fee'));
  assert.equal(severityOf('<p>Handling fee applies</p>', 'hidden-fee'), 'medium');
  assert.ok(!rulesOf('<p>No service fee, ever</p>').has('hidden-fee'));
});

test('prechecked-component: a Checkbox, Switch or Toggle that starts on is flagged (high); a controlled or off one is not', () => {
  assert.ok(rulesOf('<Checkbox defaultChecked name="newsletter" />').has('prechecked-component'));
  assert.ok(rulesOf('<Switch checked />').has('prechecked-component'));
  assert.equal(severityOf('<Toggle defaultChecked />', 'prechecked-component'), 'high');
  assert.ok(!rulesOf('<Checkbox checked={agree} onChange={set} />').has('prechecked-component'));
  assert.ok(!rulesOf('<Switch defaultChecked={false} />').has('prechecked-component'));
});

test('modal-no-close: a dialog in a file with no way to close it is flagged (high); a close button clears it', () => {
  assert.ok(rulesOf('<div role="dialog"><h2>Join us</h2><button>Yes, sign me up</button></div>').has('modal-no-close'));
  assert.equal(severityOf('<Modal><p>Join us</p></Modal>', 'modal-no-close'), 'high');
  assert.ok(!rulesOf('<div role="dialog"><button aria-label="Close">×</button></div>').has('modal-no-close'));
  assert.ok(!rulesOf('<Dialog onOpenChange={setOpen}><p>Join</p></Dialog>').has('modal-no-close'));
});

test('infinite-scroll: an endless feed with no load-more or pagination is flagged (medium); with one it is not', () => {
  assert.ok(rulesOf("import InfiniteScroll from 'react-infinite-scroll-component';").has('infinite-scroll'));
  assert.ok(rulesOf('const feed = useInfiniteQuery({ queryKey })').has('infinite-scroll'));
  assert.equal(severityOf('<InfiniteScroll next={more} />', 'infinite-scroll'), 'medium');
  assert.ok(!rulesOf('<InfiniteScroll next={more} /><button>Load more</button>').has('infinite-scroll'));
});

test('previous behavior: the first seven rules keep their ids, order and severity, and honest copy still gives no finding', () => {
  assert.deepEqual(RULES.slice(0, 7).map((rule) => `${rule.id}:${rule.severity}`), ['fake-scarcity:high', 'urgency-copy:medium', 'confirmshaming:high', 'prechecked-extra:high', 'placeholder-proof:high', 'unverified-metric:medium', 'consent-asymmetry:high']);
  const bad = rulesOf(['<p>Only 3 left! Hurry, offer ends soon</p>', '<button>No thanks, I hate saving money</button>', '<input type="checkbox" checked name="insurance">', '<p>John Doe says it is great. Trusted by 10,000+ teams</p>', '<button>Accept all cookies</button>'].join('\n'));
  for (const rule of ['fake-scarcity', 'urgency-copy', 'confirmshaming', 'prechecked-extra', 'placeholder-proof', 'unverified-metric', 'consent-asymmetry']) assert.ok(bad.has(rule), rule);
  assert.equal(scanText('<button>Accept all</button><button>Reject all</button><p>Plans start at $9/month, cancel any time.</p>').length, 0);
});

test('a page that is honest in every way the new rules look at gives no finding', () => {
  const page = [
    '<h1>Fresh bread, delivered</h1>',
    '<p>Plans start at $9/month. Cancel any time from your account page, in one click.</p>',
    '<p>No service fee, ever. The price you see is the price you pay.</p>',
    '<Checkbox checked={newsletter} onChange={setNewsletter} label="Send me the monthly letter" />',
    '<div role="dialog"><button aria-label="Close">×</button></div>',
    '<button className="btn">Accept all</button><button className="btn">Reject all</button>',
    '<button>Load more</button>',
  ].join('\n');
  assert.deepEqual(scanText(page), []);
});

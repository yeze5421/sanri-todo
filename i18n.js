(function (root, factory) {
  'use strict';
  const translations = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = translations;
  else root.SanriI18n = translations;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const KEY = 'sanri.language.v1';
  const english = Object.freeze({
    '三日 — 有些事，过三天就算了': 'Sanri — Three days. Then let it go.',
    '每个待办只活三天。做完很好，没做完，也没关系。一张帮你放下拖延焦虑的清单。': 'A gentler to-do list. Every task lives for three days. Finish it, or let it fade away. Either is okay.',
    '跳到清单': 'Skip to your list',
    '三日首页': 'Sanri home',
    '三日': 'Sanri',
    '主导航': 'Main navigation',
    '我的清单': 'My list',
    '关于三日': 'About Sanri',
    '轻一点，也很好': 'A little lighter is enough',
    '界面语言': 'Interface language',
    '有些事，': 'Three days.',
    '过三天': 'Then ',
    '就算了。': 'let it go.',
    '每个待办只活三天。': 'Every task lives for three days. ',
    '做完很好，没做完，也没关系。': 'Done is good. Not done is okay, too.',
    '眼下的小事': 'Little things, for now',
    '慢慢来，刚刚好。': 'Your pace is the right pace.',
    '添加一件想做的小事，最多 120 个字': 'Add a little thing to do, up to 120 characters',
    '写一件想做的小事…': 'Something you’d like to do…',
    '放进清单': 'Add to list',
    '从现在起，它有 72 小时。无需设置截止日期。': 'It has 72 hours from now. No deadline to set.',
    '这是示例清单，先感受一下。': 'A sample list. Give it a try.',
    '开始我的清单 ↗': 'Start my list ↗',
    '返回我的清单 ↗': 'Back to my list ↗',
    '清单视图': 'List view',
    '还在这里': 'Still here',
    '已完成': 'Done',
    '切换到下一种时间状态': 'Show time filters',
    '按时间筛选': 'Filter by age',
    '全部': 'All',
    '全部状态': 'All stages',
    '筛选时间状态：{stage}': 'Filter by age: {stage}',
    '刚刚开始': 'Just beginning',
    '渐渐变淡': 'Fading gently',
    '快要消失': 'Almost gone',
    '待办清单': 'To-do list',
    '完成，是一种轻松。放下，也是。': 'Finishing feels lighter. So does letting go.',
    '每件事 · 3 天': 'Each task · 3 days',
    '示例清单 · 可放心体验': 'A sample · yours stays safe',
    '只保存在你的浏览器里。你的心事，只属于你。': 'Saved only in this browser. Your thoughts stay yours.',
    '浏览器暂时无法保存；本次清单仅在当前页面有效。': 'Storage is unavailable. This list will last only for this session.',
    '三日的节奏': 'The rhythm of Sanri',
    '一件小事的三天': 'Three days of a little thing',
    '第一天': 'Day one',
    '第二天': 'Day two',
    '第三天': 'Day three',
    '清晰': 'Fresh',
    '渐淡': 'Fading',
    '随风': 'Drifting',
    '刚刚想起，就放在这里。': 'A new thought. A little space for it.',
    '没关系，生活有自己的节奏。': 'It’s okay. Life has its own rhythm.',
    '慢慢变淡，然后轻轻离开。': 'Slowly fading, then gently drifting away.',
    '这件事其实没那么重要': 'Maybe it wasn’t that important.',
    '它离开时，会这样告诉你。': 'A little reminder as it leaves.',
    '让时间走一会儿': 'Let time wander',
    '体验': 'Try it',
    '不用等三天，看看待办怎样轻轻消失。': 'No need to wait three days. See a task fade away.',
    '拖动时间，看小事慢慢变轻。': 'Move time forward. Watch things get lighter.',
    '体验 72 小时': 'Try 72 hours',
    '时间向前': 'Time ahead',
    '{hours} 小时': '{hours}h',
    '重置时间演示': 'Reset the time demo',
    '演示时间向前推进的小时数': 'Hours to move forward in the demo',
    '现在': 'Now',
    '仅影响示例，不会改变你的清单。': 'Only the sample changes. Your list stays yours.',
    '件事，认真做完': 'things thoughtfully done',
    '件事，轻轻放下': 'things gently let go',
    '给待办一个保质期，给自己一点余地。': 'Give tasks a little time. Give yourself a little room.',
    '这里没有逾期，只有过去。': 'Nothing overdue. Just things that pass.',
    '关闭关于三日': 'Close About Sanri',
    '清单应该让你轻松一点。': 'A list should help you breathe.',
    '三日是一张会过期的待办清单。每件事从创建那一刻起，只停留': 'Sanri is a to-do list with an expiry date. Every task gets just ',
    '72 小时': '72 hours',
    '：第一天清晰，第二天渐淡，第三天随风离开。': ' from the moment you add it: fresh on day one, fading on day two, and drifting away on day three.',
    '过期后，未完成的事项会从清单中消失，只留下一句「这件事其实没那么重要」。已经完成的事项，会留在「已完成」里。': 'After 72 hours, unfinished tasks disappear with a gentle thought: “Maybe it wasn’t that important.” Finished tasks stay in Done.',
    '无需账号，数据只保存在当前浏览器。关闭网页后，时间仍会流逝；再次打开时会整理过期事项。清除浏览器数据也会清空清单。': 'No account needed. Your list stays in this browser. Time keeps moving while the page is closed, and expired tasks are cleared when you return. Clearing browser data also clears your list.',
    '没有连续打卡，没有落后提醒。': 'No streaks. No falling-behind reminders.',
    '今天做一点，或者，放过自己。': 'Do a little today. Or give yourself a break.',
    '好，轻一点。': 'A little lighter, then.',
    '撤销': 'Undo',
    '关闭提示': 'Dismiss notification',
    '请启用 JavaScript，让这张清单随着时间慢慢变轻。': 'Please enable JavaScript to let your list get lighter with time.',
    '出门走走，买一束喜欢的花': 'Take a walk and bring home some flowers',
    '读几页床头的那本书': 'Read a few pages of that bedside book',
    '整理一下收藏夹里的灵感': 'Sort through those saved ideas',
    '即将随风离开': 'Drifting away soon',
    '还有 {minutes} 分钟': '{minutes} min left',
    '还有 {hours} 小时{minutes}': '{hours}h{minutes} left',
    ' {minutes} 分': ' {minutes}m',
    '刚刚放进来': 'Just added',
    '今天放进来': 'Added today',
    '昨天放进来': 'Added yesterday',
    '前天放进来': 'Added two days ago',
    '已完成：{task}': 'Done: {task}',
    '完成：{task}': 'Complete: {task}',
    '认真做完了': 'Thoughtfully done',
    '轻轻离开': 'Gently let go',
    '{date}完成': 'Done on {date}',
    '做得很好': 'Nicely done',
    '将于 {date} 自然消失': 'Fades away on {date}',
    '现在就放下': 'Let it go now',
    '放下：{task}': 'Let go: {task}',
    '空白，也是一种刚刚好。': 'A little space feels just right.',
    '想到什么再写下。现在，先好好生活。': 'Add something when it comes to mind. For now, just live.',
    '不着急，按自己的节奏。': 'No rush. Find your own rhythm.',
    '做完的小事，会在这里留下一个小小的肯定。': 'The things you finish will find a little home here.',
    '此刻，没有这样的待办。': 'Nothing at this stage right now.',
    '换个状态看看，或给自己留一点空白。': 'Try another filter, or enjoy a little space.',
    '三天过去了。清单空了，你也可以轻一点。': 'Three days have passed. The list is clear. Breathe a little easier.',
    '看看全部小事 →': 'See all the little things →',
    '写下我的第一件小事 →': 'Add my first little thing →',
    '＋ 写一件小事': '＋ Add a little thing',
    '这件事其实没那么重要。轻轻放下了。': 'Maybe it wasn’t that important. Gently let go.',
    '又做好了一件小事。今天的你，很好。': 'One little thing done. You’re doing just fine.',
    '三天已经过去，就让它留在已完成里吧。': 'Three days have passed. Let it stay in Done.',
    '放回清单了。按自己的节奏来。': 'Back on your list. Take it at your own pace.',
    '这件事其实没那么重要。放下，也很好。': 'Maybe it wasn’t that important. Letting go is okay.',
    '三天已经过去，就让它轻轻离开吧。': 'Three days have passed. Let it drift away.',
    '放回清单了，仍是最初的三天。': 'Back on your list, with its original three days.',
    '写下一件小事，再放进来吧。': 'Write a little thing before adding it.',
    '放进来了。给它三天，也给自己一点余地。': 'Added. Give it three days, and give yourself a little room.',
    '已放进清单，但浏览器暂时无法保存。': 'Added, but this browser is unable to save your list.',
    '这件事其实没那么重要。它已经随风离开。': 'Maybe it wasn’t that important. It has drifted away.',
    '写下一件小事吧': 'Write a little thing to do.',
    '每件小事最多写 120 个字符': 'Keep each little thing under 121 characters.',
    '时间必须是有效的时间戳': 'The time is invalid. Please try again.',
    '待办标识无效': 'This task could not be added. Please try again.'
  });
  function normalizeLanguage(value) { return value === 'en' ? 'en' : 'zh-CN'; }
  function readLanguage() {
    try { return normalizeLanguage(root.localStorage.getItem(KEY)); }
    catch { return 'zh-CN'; }
  }
  let language = readLanguage();
  function t(key, values = {}) {
    const phrase = language === 'en' && Object.hasOwn(english, key) ? english[key] : key;
    // Replace once so a user's text containing braces is never interpreted as a template.
    return phrase.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function setLanguage(value, persist = true) {
    language = normalizeLanguage(value);
    if (persist) {
      try { root.localStorage.setItem(KEY, language); }
      catch { /* Switching still works when browser storage is unavailable. */ }
    }
    return language;
  }
  function apply(document = root.document) {
    if (!document) return;
    document.documentElement.lang = language;
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.getAttribute('data-i18n'));
    for (const attribute of ['aria-label', 'title', 'placeholder', 'content']) {
      for (const node of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
        node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`)));
      }
    }
    for (const button of document.querySelectorAll('[data-language]')) {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    }
  }
  return Object.freeze({ KEY, english, t, apply, readLanguage, setLanguage,
    getLanguage: () => language, getLocale: () => language === 'en' ? 'en-US' : 'zh-CN' });
});

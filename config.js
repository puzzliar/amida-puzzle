/*
 * 公開設定
 * SUPABASE_URL / SUPABASE_ANON_KEY を空のままにすると、ランキングは「この端末内のみ」で動作する。
 * オンラインランキングを有効にするには supabase/schema.sql を適用し、
 * プロジェクトURLと publishable(anon) キーを設定する（anon キーは公開前提のキー）。
 */
const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  EVENT_URL: 'https://puzzliar.jp/events/sakugen-amidakuji',
  HASHTAG: '削減アミダクジ',
};

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://evuhamqlzprrbuabxyyn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dWhhbXFsenBycmJ1YWJ4eXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc3ODIxNywiZXhwIjoyMTA2MzU0MjE3fQ.AZ8T_oEHoUxobvOLJ_wFpSx8SH6oEJ-D-ype1zSHqks';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanBookPlatform() {
  const { data, error: fetchErr } = await sb
    .from('settings')
    .select('*')
    .eq('workspace_id', 'default')
    .single();

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  const bs = data.block_styles || {};

  const cleanOrder = [
    'brand_card',
    'recommended_books',
    'flat_books',
    'author_profile',
    'author_philosophy',
    'author_books',
    'author_contact',
  ];

  const currentHidden = Array.isArray(bs.hidden_home_sections) ? bs.hidden_home_sections : [];
  const nextHidden = Array.from(new Set([...currentHidden, 'topics', 'recent_activity'])).filter(
    (k) => k !== 'recommended_books' && k !== 'flat_books'
  );

  const updatedBlockStyles = {
    ...bs,
    home_sections_order: cleanOrder,
    hidden_home_sections: nextHidden,
    recommended_books_title: 'GIAN TRƯNG BÀY SÁCH Y KHOA',
    recommended_books_subtitle: 'Tủ sách y khoa chuyên sâu chuẩn SideBooks 3D',
    recommended_books_layout: 'bookshelf',
    search_placeholder: 'Tìm sách, tài liệu y khoa...',
    home_title: 'Thư Viện Sách Y Khoa',
  };

  const { error } = await sb
    .from('settings')
    .update({
      block_styles: updatedBlockStyles,
    })
    .eq('workspace_id', 'default');

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('SUCCESS: Supabase settings updated for dedicated book platform!');
    console.log('New Order:', cleanOrder);
    console.log('Hidden Sections:', nextHidden);
  }
}

cleanBookPlatform();

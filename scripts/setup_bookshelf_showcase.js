const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://evuhamqlzprrbuabxyyn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dWhhbXFsenBycmJ1YWJ4eXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc3ODIxNywiZXhwIjoyMTA2MzU0MjE3fQ.AZ8T_oEHoUxobvOLJ_wFpSx8SH6oEJ-D-ype1zSHqks';

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupShowcase() {
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
  const currentHidden = Array.isArray(bs.hidden_home_sections) ? bs.hidden_home_sections : [];
  // Ensure recommended_books is visible on Home page
  const nextHidden = currentHidden.filter((k) => k !== 'recommended_books');

  const curatedBooks = [
    {
      id: 'book-hieu-dung-cot-song',
      title: 'Hiểu Đúng Về Cột Sống',
      category: 'Cột Sống & Đĩa Đệm',
      badge_tag: 'BÁN CHẠY',
      cover_url: '/documents/covers/cover_hieu_dung_ve_cot_song.png',
      description:
        'Cẩm nang toàn diện giải mã cơ chế thoát vị đĩa đệm, thoái hóa và giải pháp vận động tự phục hồi.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'BÁN CHẠY',
    },
    {
      id: 'book-atlas-cot-song',
      title: 'Atlas Giải Phẫu Cột Sống & Khớp',
      category: 'Giải Phẫu 3D',
      badge_tag: 'ATLAS 3D',
      cover_url: '/documents/covers/cover_atlas_y_khoa_toan_dien.png',
      description:
        'Atlas giải phẫu sinh động 33 đốt sống, 23 đĩa đệm và hệ thống dây chằng nâng đỡ cơ thể.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'ATLAS 3D',
    },
    {
      id: 'book-cam-nang-co',
      title: 'Cẩm Nang Đốt Sống Cổ & Vai Gáy',
      category: 'Cột Sống Cổ',
      badge_tag: 'HƯỚNG DẪN',
      cover_url: '/documents/covers/cover_cam_nang_dot_song_co.png',
      description:
        'Phương pháp bảo tồn đốt sống cổ C1-C7, giải phóng chèn ép rễ thần kinh và chống hội chứng cổ rùa.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'HƯỚNG DẪN',
    },
    {
      id: 'book-dinh-duong-khang-viem',
      title: 'Dinh Dưỡng Kháng Viêm Sinh Học',
      category: 'Dinh Dưỡng Trị Liệu',
      badge_tag: 'Y HỌC',
      cover_url: '/documents/covers/cover_dinh_duong_khang_viem.png',
      description:
        'Chế độ ăn kháng viêm tế bào sụn, dập tắt ngọn lửa viêm mạn tính và cấp nước thông minh cho khớp.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'Y HỌC',
    },
    {
      id: 'book-tu-chua-lanh-lung',
      title: 'Tự Chữa Lành Đau Lưng & Cổ',
      category: 'Phục Hồi Chủ Động',
      badge_tag: 'PHỤC HỒI',
      cover_url: '/documents/covers/cover_tu_chua_lanh_lung_co.png',
      description:
        'Chuỗi bài tập 15 phút mỗi ngày giải áp tự nhiên, cân bằng cơ co rút và khôi phục đường cong sinh lý.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'PHỤC HỒI',
    },
    {
      id: 'book-giai-ma-cot-song',
      title: 'Giải Mã Cột Sống & Thoát Vị',
      category: 'Cơ Sinh Học',
      badge_tag: 'CHUYÊN SÂU',
      cover_url: '/documents/covers/cover_giai_ma_cot_song.png',
      description:
        'Phân tích cơ chế đòn bẩy tải trọng, quy tắc công thái học và kỹ thuật kích hoạt cơ lõi bảo vệ cột sống.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'CHUYÊN SÂU',
    },
    {
      id: 'book-giai-phau-co-the',
      title: 'Giải Phẫu Học Cơ Thể Người',
      category: 'Y Học Toàn Diện',
      badge_tag: 'TOÀN TẬP',
      cover_url: '/documents/covers/cover_co-the-nguoi.png',
      description:
        'Tổng quan cấu trúc các hệ cơ quan trong cơ thể: Xương khớp, tuần hoàn, hô hấp và miễn dịch.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'TOÀN TẬP',
    },
    {
      id: 'book-he-tieu-hoa',
      title: 'Hệ Tiêu Hóa & Vi Sinh Đường Ruột',
      category: 'Hệ Tiêu Hóa',
      badge_tag: 'VI SINH',
      cover_url: '/documents/covers/cover_tieu-hoa.png',
      description:
        'Trục não - ruột và vai trò của hệ vi sinh vật trong khả năng hấp thu dinh dưỡng và tái tạo khớp.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'VI SINH',
    },
    {
      id: 'book-he-mien-dich',
      title: 'Hệ Miễn Dịch Tự Nhiên Cơ Thể',
      category: 'Miễn Dịch Học',
      badge_tag: 'BẢO VỆ',
      cover_url: '/documents/covers/cover_mien-dich.png',
      description:
        'Lá chắn phòng vệ sinh học tự nhiên chống viêm nhiễm và cơ chế tự làm sạch của đại thực bào.',
      author: 'Dr. Tùng',
      is_visible: true,
      tag: 'BẢO VỆ',
    },
  ];

  const updatedBlockStyles = {
    ...bs,
    hidden_home_sections: nextHidden,
    recommended_books_title: 'GIAN TRƯNG BÀY SÁCH Y KHOA',
    recommended_books_subtitle: 'Tủ sách y khoa chuyên sâu chuẩn SideBooks 3D',
    recommended_books_layout: 'bookshelf',
    recommended_books: curatedBooks,
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
    console.log('SUCCESS: Settings updated with 3D Wooden Bookshelf showcase!');
  }
}

setupShowcase();

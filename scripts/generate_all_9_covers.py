import os
from PIL import Image, ImageDraw, ImageFont

def draw_cover(template_path, out_path, cat_text, title_lines, subtitle, author='TÙNG DINH DƯỠNG', tint_color=None, tint_strength=0.28):
    im = Image.open(template_path).convert('RGB')
    if tint_color:
        overlay = Image.new('RGB', im.size, tint_color)
        im = Image.blend(im, overlay, tint_strength)
    
    draw = ImageDraw.Draw(im)
    w, h = im.size
    
    font_cat = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 16)
    font_title = ImageFont.truetype('C:/Windows/Fonts/timesbd.ttf', 38)
    font_sub = ImageFont.truetype('C:/Windows/Fonts/timesi.ttf', 20)
    font_author = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 18)
    font_footer = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
    
    gold_bright = (255, 235, 160)
    gold_dark = (210, 165, 80)
    gold_accent = (245, 215, 130)
    shadow = (10, 10, 15)
    
    # 1. Category Ribbon at top (y=150)
    cat_bbox = draw.textbbox((0, 0), cat_text, font=font_cat)
    cat_w = cat_bbox[2] - cat_bbox[0]
    cat_x = (w - cat_w) // 2
    cat_y = 150
    pad_x, pad_y = 16, 6
    draw.rounded_rectangle((cat_x - pad_x, cat_y - pad_y, cat_x + cat_w + pad_x, cat_y + (cat_bbox[3]-cat_bbox[1]) + pad_y), radius=4, outline=gold_dark, width=1)
    draw.text((cat_x, cat_y), cat_text, font=font_cat, fill=gold_accent)
    
    # 2. Medical Emblem / Caduceus at y=230
    emblem_y = 230
    draw.line((w//2 - 60, emblem_y, w//2 + 60, emblem_y), fill=gold_dark, width=1)
    draw.circle((w//2, emblem_y), radius=6, fill=gold_bright, outline=gold_dark)
    draw.line((w//2, emblem_y - 25, w//2, emblem_y + 25), fill=gold_accent, width=2)
    draw.line((w//2 - 15, emblem_y - 12, w//2 + 15, emblem_y - 12), fill=gold_bright, width=2)
    draw.circle((w//2, emblem_y - 25), radius=4, fill=gold_bright)
    
    # 3. Title lines (y=330)
    title_y = 330
    for line in title_lines:
        t_bbox = draw.textbbox((0, 0), line, font=font_title)
        tw = t_bbox[2] - t_bbox[0]
        tx = (w - tw) // 2
        draw.text((tx + 2, title_y + 2), line, font=font_title, fill=shadow)
        draw.text((tx, title_y), line, font=font_title, fill=gold_bright)
        title_y += (t_bbox[3] - t_bbox[1]) + 18
        
    # 4. Subtitle
    sub_y = title_y + 20
    s_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = s_bbox[2] - s_bbox[0]
    sx = (w - sw) // 2
    draw.text((sx + 1, sub_y + 1), subtitle, font=font_sub, fill=shadow)
    draw.text((sx, sub_y), subtitle, font=font_sub, fill=(235, 230, 215))
    
    # 5. Middle decorative divider at y=600
    div_y = 600
    draw.line((w//2 - 90, div_y, w//2 - 15, div_y), fill=gold_dark, width=1)
    draw.line((w//2 + 15, div_y, w//2 + 90, div_y), fill=gold_dark, width=1)
    draw.polygon([(w//2, div_y - 7), (w//2 + 7, div_y), (w//2, div_y + 7), (w//2 - 7, div_y)], fill=gold_bright)
    
    # 6. Seal circle at y=690
    seal_y = 690
    draw.circle((w//2, seal_y), radius=35, outline=gold_dark, width=1)
    draw.circle((w//2, seal_y), radius=30, outline=gold_accent, width=1)
    draw.polygon([(w//2, seal_y - 12), (w//2 + 10, seal_y), (w//2, seal_y + 12), (w//2 - 10, seal_y)], outline=gold_bright, width=1)
    
    # 7. Author at bottom (y=920)
    auth_text = f'TÁC GIẢ: {author.upper()}'
    a_bbox = draw.textbbox((0, 0), auth_text, font=font_author)
    aw = a_bbox[2] - a_bbox[0]
    ax = (w - aw) // 2
    draw.text((ax + 1, 921), auth_text, font=font_author, fill=shadow)
    draw.text((ax, 920), auth_text, font=font_author, fill=gold_accent)
    
    # 8. Footer subtitle (y=960)
    foot_text = 'NỀN TẢNG GIÁO DỤC CHĂM SÓC SỨC KHỎE CHỦ ĐỘNG'
    f_bbox = draw.textbbox((0, 0), foot_text, font=font_footer)
    fw = f_bbox[2] - f_bbox[0]
    fx = (w - fw) // 2
    draw.text((fx, 960), foot_text, font=font_footer, fill=(200, 185, 160))
    
    im.save(out_path)
    print('Generated unique cover:', out_path)

def main():
    p = 'public/documents/covers'
    
    # Book 5: Sức khỏe hệ tiêu hóa toàn diện
    draw_cover(
        os.path.join(p, 'clean_cover_slate.png'),
        os.path.join(p, 'cover_tieu-hoa.png'),
        'CHUYÊN ĐỀ TIÊU HÓA & ĐƯỜNG RUỘT',
        ['SỨC KHỎE HỆ TIÊU HÓA', 'TOÀN DIỆN'],
        'Đường ruột, men tiêu hóa & cơ chế thanh lọc tự nhiên',
        tint_color=(125, 62, 18), # Warm Amber Brown
        tint_strength=0.35
    )
    
    # Book 6: Nước & khoáng chất cho cơ thể
    draw_cover(
        os.path.join(p, 'clean_cover_navy.png'),
        os.path.join(p, 'cover_nuoc.png'),
        'CHUYÊN ĐỀ NƯỚC UỐNG & TẾ BÀO',
        ['NƯỚC & KHOÁNG CHẤT', 'CHO CƠ THỂ'],
        'Cấp nước tế bào, cân bằng ion kiềm và hydrogen tự nhiên',
        tint_color=(14, 75, 115), # Deep Ocean Cyan
        tint_strength=0.30
    )
    
    # Book 7: Tự chữa lành lưng & cổ tại nhà
    draw_cover(
        os.path.join(p, 'clean_cover_emerald.png'),
        os.path.join(p, 'cover_tu_chua_lanh_lung_co.png'),
        'CHUYÊN ĐỀ PHỤC HỒI CỘT SỐNG',
        ['TỰ CHỮA LÀNH', 'LƯNG & CỔ TẠI NHÀ'],
        'Giải phóng chèn ép rễ thần kinh & hồi phục đĩa đệm',
        tint_color=(10, 70, 45), # Forest Jade
        tint_strength=0.15
    )
    
    # Book 8: Lợi khuẩn & hệ vi sinh đường ruột
    draw_cover(
        os.path.join(p, 'clean_cover_slate.png'),
        os.path.join(p, 'cover_loi_khuan_duong_ruot.png'),
        'CHUYÊN ĐỀ VI SINH VẬT & MIỄN DỊCH',
        ['LỢI KHUẨN & HỆ VI SINH', 'ĐƯỜNG RUỘT'],
        'Hệ sinh thái vi khuẩn và trục liên kết Não - Ruột',
        tint_color=(75, 20, 95), # Royal Amethyst Purple
        tint_strength=0.38
    )
    
    # Book 9: Hệ miễn dịch tự nhiên cơ thể
    draw_cover(
        os.path.join(p, 'clean_cover_slate.png'),
        os.path.join(p, 'cover_mien-dich.png'),
        'CHUYÊN ĐỀ BẢO VỆ TẾ BÀO',
        ['HỆ MIỄN DỊCH', 'TỰ NHIÊN CƠ THỂ'],
        'Lá chắn sinh học tự nhiên và sức đề kháng chủ động',
        tint_color=(45, 45, 55), # Charcoal Obsidian Gold
        tint_strength=0.15
    )

if __name__ == '__main__':
    main()

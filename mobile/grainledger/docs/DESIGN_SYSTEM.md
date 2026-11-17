# GrainLedger Mobile — iOS HIG Design System

Cập nhật: 2026-11-17. Định hướng: giao diện gọn, sáng rõ, dễ đọc và thao tác như iOS; nền trắng ở Light Mode, nền đen ở Dark Mode, xanh lá GrainLedger dùng tiết chế cho điểm nhấn.

## 1. Phạm vi và trạng thái

Đây là **đặc tả thiết kế mục tiêu cho toàn bộ mobile app**, gồm Landing, Auth, Dashboard, Tồn kho và các màn hình chuyển đổi sau này. Định hướng này thay thế quy tắc cũ về nền xanh rừng, điểm nhấn vàng hạt và Glass phủ khắp nội dung. Landing là bước tham khảo ban đầu, không còn là ngoại lệ duy nhất được áp dụng phong cách iOS.

Lần cập nhật này chỉ sửa tài liệu. Theme và component đang chạy chưa tự đổi theo bảng màu bên dưới. Màu hex, kích thước và thời lượng ở đây là lựa chọn của dự án lấy cảm hứng từ HIG, không phải bộ giá trị bắt buộc của Apple hay cam kết dùng native UIKit/Liquid Glass.

| Nơi quản lý | Vai trò khi triển khai |
| --- | --- |
| `src/theme/tokens.ts` | Nguồn runtime tập trung cho màu, chữ, khoảng cách, bo góc và hiệu ứng; cần chuyển đổi trong tác vụ riêng. |
| `src/theme/ThemeProvider.tsx` | Giữ System/Light/Dark, lưu lựa chọn, hydrate và xử lý lỗi storage. |
| `src/components/glass/` | Tái sử dụng hợp đồng component; điều chỉnh hình thức tập trung, ưu tiên mặt phẳng đặc cho nội dung. |
| `src/constants/theme.ts` / `useTheme()` | Adapter lấy từ theme chung, không tạo palette riêng. |
| `src/features/landing/landing-ui.tsx` | Đang có palette trung tính riêng; cần hợp nhất với token chung khi triển khai. |
| `/theme-demo` | Kiểm tra token/control sau khi chuyển đổi, chưa là bằng chứng nghiệm thu bảng màu mới. |

## 2. Nguyên tắc trải nghiệm

- Đưa nội dung quan trọng lên trước: tiêu đề, thông tin chính và hành động tiếp theo. Dùng căn lề, cỡ chữ, khoảng trắng và nhóm nội dung để tạo thứ bậc.
- Giữ vị trí và hành vi Back, tìm kiếm, bộ lọc, tab nhất quán. Mọi màn hình có đường quay lại rõ ràng.
- Đưa thông tin bổ sung vào màn chi tiết hoặc disclosure có nhãn. Không giấu HOLD, lỗi quyền hay dữ liệu ảnh hưởng quyết định nghiệp vụ trong phần đóng.
- Phản hồi ngay khi chạm, trạng thái xử lý rõ ràng. Giữ thông tin nhập và ngữ cảnh danh sách khi quay lại.
- Tối ưu một tay, chữ lớn và màn hình hẹp. Android vẫn giữ hành vi hệ thống quen thuộc.

Phân cấp, nhóm nội dung và disclosure tham khảo [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout.md). Cách áp dụng cho GrainLedger là quyết định của dự án.

## 3. Màu sắc mục tiêu

### Nền và chữ trung tính

| Token mục tiêu | Light | Dark | Cách dùng |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `#000000` | Nền màn hình tiêu chuẩn. |
| `backgroundGrouped` | `#F2F2F7` | `#000000` | Nền trang có các nhóm danh sách/form. |
| `surface` | `#FFFFFF` | `#1C1C1E` | Nhóm nội dung, card, ô nhập. |
| `surfaceRaised` | `#F2F2F7` | `#2C2C2E` | Lớp nổi hoặc vùng phụ cần phân biệt. |
| `textPrimary` | `#1C1C1E` | `#F2F2F7` | Tiêu đề, nội dung chính, số liệu. |
| `textSecondary` | `#636366` | `#AEAEB2` | Mô tả, đơn vị, metadata vẫn cần đọc rõ. |
| `separator` / `border` | `#D1D1D6` | `#38383A` | Phân cách trang trí; không làm tín hiệu duy nhất cho control. |
| `controlBorder` | `#767680` | `#8E8E93` | Biên control cần nhận diện khi không có nền/nhãn khác đủ rõ. |
| `disabledSurface` | `#E5E5EA` | `#2C2C2E` | Nền control vô hiệu hóa. |
| `textDisabled` | `#636366` | `#AEAEB2` | Đi cùng trạng thái disabled, không dùng cho dữ liệu quan trọng. |

Danh sách/form thường dùng `backgroundGrouped` với nhóm `surface`; trang nội dung đơn giản có thể dùng `background`. Tránh chồng nhiều lớp trắng rồi thêm bóng để tạo phân cấp. Dark Mode dùng độ sáng của surface để phân biệt lớp; chữ trắng dịu giúp giảm chói trên nền đen.

### Xanh lá là màu nhấn thương hiệu duy nhất

| Token mục tiêu | Light | Dark | Cách dùng |
| --- | --- | --- | --- |
| `primary` / `accent` / `focus` | `#176347` | `#85DCB2` | CTA chính, liên kết, tab đang chọn, focus. |
| `onPrimary` | `#FFFFFF` | `#102B20` | Chữ/icon trên nút xanh đặc. |
| `selectedSurface` | `#E9F2ED` | `#17392A` | Nền chọn nhẹ trên vùng nhỏ. |

- Không phủ xanh lên nền màn hình, toàn bộ card/header hoặc mọi KPI. Không dùng gradient xanh/vàng hay glow.
- Mỗi vùng tác vụ ưu tiên một CTA xanh đặc. Hành động phụ dùng chữ xanh hoặc control trung tính, có dấu hiệu tương tác rõ.
- Tab/bộ lọc đang chọn có điểm nhấn xanh và trạng thái selected. Icon điều hướng chưa chọn dùng xám.
- Số dư, mã lô, tiêu đề và nội dung thường dùng chữ trung tính. Màu xanh không tự xác nhận lô đủ điều kiện xuất hàng.
- Đồ thị dùng xám và xanh nhấn chuỗi đang xem; thêm nhãn/ký hiệu/hoa văn khi cần phân biệt nhiều chuỗi. Không thêm palette trang trí đa sắc.

### Trạng thái chức năng

`info` dùng chữ trung tính. `warning` dùng icon, nhãn và thông báo rõ trên nền trung tính; không dùng vàng/cam làm màu nhấn phụ. Thành công dùng nhãn xác nhận và có thể thêm icon xanh nhỏ, không tô cả card.

Đỏ chỉ dành cho lỗi, hành động phá hủy hoặc HOLD/chặn nghiệp vụ: `danger` Light `#B42332`, Dark `#FF9AA2`. Đây là mã trạng thái chức năng, không dùng trang trí hay tạo CTA thứ hai. Luôn có nhãn như “Không thể tải”, “Đang HOLD”, “Xóa”. Backend quyết định trạng thái và quyền thao tác.

Mỗi vai trò màu phải nhất quán và có biến thể sáng/tối, theo [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color.md). Palette tùy chỉnh này không tự có khả năng thích ứng như dynamic system colors.

## 4. Chữ và số liệu

Dùng font sans mặc định hệ điều hành; trên iOS để hệ thống chọn font phù hợp. Không thêm font chỉ để mô phỏng SF Pro, không dùng serif cho tiêu đề app. Bảng dưới là cỡ thiết kế gốc trước khi áp dụng lựa chọn cỡ chữ của người dùng.

| Vai trò | Cỡ / line height | Weight | Dùng cho |
| --- | --- | --- | --- |
| Large Title | 34 / 42 | 700 | Trang gốc của tab hoặc màn hình chính. |
| Title | 28 / 34 | 600 | Tiêu đề nội dung cần nhấn. |
| Section Heading | 20 / 26 | 600 | Nhóm thông tin. |
| Navigation Title | 17 / 22 | 600 | Thanh điều hướng gọn. |
| Body | 17 / 24 | 400 | Nội dung, giá trị trong hàng danh sách. |
| Control Label | 17 / 22 | 500–600 | Nút và nhãn form. |
| Secondary | 15 / 22 | 400 | Mô tả phụ. |
| Caption | 13 / 18 | 400 | Metadata ngắn, không chứa hướng dẫn thiết yếu. |

Giữ font scaling, cho phép xuống dòng và tăng chiều cao hàng. Khi chữ lớn, chuyển hàng nhãn/giá trị và lưới KPI sang một cột. Không thu nhỏ cả trang để ép vừa màn hình. Tham khảo [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography.md).

Khối lượng dùng chữ số tabular, đơn vị `kg` và định dạng theo locale. Giữ decimal-string/Decimal và quy tắc làm tròn đã xác định; danh sách hiện dùng 3 chữ số thập phân, chi tiết dùng 6. Thiếu dữ liệu hiển thị dấu gạch/nhãn chưa được cung cấp; chỉ hiển thị `0` khi dữ liệu thật là 0. Ghi rõ tổng thuộc trang hiện tại hay toàn bộ dữ liệu.

## 5. Bố cục và hình khối

- Nhịp khoảng cách 4/8: 4, 8, 12, 16, 20, 24, 32. Gutter điện thoại 16–20; khoảng cách nhóm 24–32.
- Hàng thường padding ngang 16, dọc 12–16; tự tăng chiều cao theo chữ. Vùng chạm tối thiểu 48 logical units cho cả hai nền tảng là quy ước chung của dự án.
- Bo nhóm/card 16–20, control 12–14, sheet 24–28. Pill dùng cho control phù hợp; không áp dụng cho mọi nhóm thông tin.
- Dùng một nền nhóm và separator mảnh giữa các hàng. Nội dung mặc định không có bóng; sheet/menu dùng surface và bóng nhẹ khi cần phân lớp.
- Một cột trên điện thoại. Chỉ dùng hai cột khi nhãn/số vẫn dễ đọc ở cỡ chữ hiện tại. Form rộng tối đa khoảng 560, nội dung khoảng 800; chữ lớn được ưu tiên hơn lưới.
- Tôn trọng safe area và bàn phím. Tab bar hiện đã chiếm chỗ trong layout; không cộng padding cố định giả định chiều cao thanh tab.

## 6. Điều hướng, danh sách và tìm kiếm

Giữ Expo Router, root Stack và các tab Home/Stock/Account hiện có. Tab là điểm đến cấp cao; chi tiết được đẩy trong stack của tab. Tab được chọn có nhãn/icon xanh; tab khác trung tính, không tô toàn thanh xanh.

Trang gốc có thể dùng Large Title; màn chi tiết dùng tiêu đề gọn và Back rõ ràng. Chỉ thêm thu gọn tiêu đề theo cuộn khi hành vi ổn định. Back/swipe-back giữ ngữ cảnh hợp lý; đường dẫn trực tiếp có lối thoát về danh sách.

Danh sách ưu tiên grouped rows với vùng chạm rõ và chevron khi dẫn tới chi tiết. Tránh lặp nút xanh đặc ở từng hàng. Tìm kiếm có ý nghĩa rõ; xóa truy vấn không tự xóa các bộ lọc khác. Bộ lọc đang áp dụng phải nhìn thấy và có cách xóa. Dùng màn/sheet bộ lọc khi dãy chip dài khiến khó chọn hoặc khó đọc.

Giữ tìm kiếm bằng submit và phân trang theo API hiện có cho đến khi có tác vụ đổi hành vi riêng. Cung cấp refresh phù hợp, nút thay thế thao tác kéo và trạng thái điều khiển trang rõ. Không suy đoán còn trang từ số hàng.

## 7. Control, form và phản hồi

| Thành phần | Hình thức và hành vi mục tiêu |
| --- | --- |
| Nút chính | Xanh đặc, nhãn theo hành động. Đang gửi có spinner/nhãn xử lý và chặn gửi trùng; kích thước/vị trí ổn định. |
| Nút phụ | Chữ xanh hoặc nền xám nhẹ, không lặp bóng/viền nổi. Pressed/focus nhận biết rõ. |
| Input | Nhãn luôn có, nền đặc trung tính, focus xanh; keyboard/autofill đúng. Lỗi gần field, giữ dữ liệu nhập khi có thể. |
| Switch / lựa chọn | Dùng đúng vai trò bật/tắt, chọn một/chọn nhiều; có trạng thái truy cập được. Không dùng switch để điều hướng. |
| Disclosure | Nhãn và dấu hiệu mở/đóng rõ, thông báo expanded. Không giấu lỗi/trạng thái chặn thiết yếu. |
| Sheet / menu | Thao tác hoặc ngữ cảnh phụ; nội dung dài đi vào màn riêng. Có đóng/hủy và hỗ trợ quay lại hệ thống. |
| Hành động phá hủy | Nhãn cụ thể, đỏ tiết chế; xác nhận khi hậu quả khó đảo ngược, nêu rõ đối tượng. |

Phân biệt loading, success, empty phù hợp bộ lọc, dữ liệu không được cung cấp, không có quyền và lỗi mạng/hệ thống. Không dùng “trống” hoặc KPI 0 che lỗi. Chỉ báo thành công sau kết quả thực, không dùng timer/animation giả kết quả backend.

Phản hồi cạnh vùng bị ảnh hưởng, Retry khi phù hợp; tránh nhiều banner/spinner cùng nghĩa. Toast không che hành động thiết yếu. Không đưa chi tiết kỹ thuật/API vào luồng người dùng nếu không giúp họ xử lý vấn đề.

## 8. Material và chuyển động

Nội dung, form, KPI và hàng danh sách mặc định dùng surface đặc trung tính. Translucency nhẹ chỉ ở điều hướng/toolbar/tab bar khi giúp phân lớp và vẫn đọc rõ. Không blur nhiều lớp, gradient phủ trang hoặc viền phát sáng.

Phân tách lớp điều khiển và nội dung tham khảo [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials.md). Glass hiện có là component React Native của dự án, không đồng nghĩa native Liquid Glass.

Phản hồi chạm bắt đầu ngay. Chuyển trạng thái ngắn và có mục đích; 150–250 ms là mốc tham khảo dự án, không áp dụng cứng cho mọi tương tác. Giữ animation điều hướng nền tảng; tránh bounce/chuyển cảnh làm chậm thao tác. Tương tác kéo theo ngón tay, có thể đổi hướng và không chặn input để chờ animation.

Reduce Motion bỏ dịch chuyển/phóng to không thiết yếu. Reduce Transparency hoặc nền tảng không hỗ trợ blur phù hợp dùng nền đặc. Không thêm haptic/dependency để trang trí; chỉ bổ sung khi tác vụ cần phản hồi có ý nghĩa.

## 9. Hợp đồng component và appearance đang có

Giữ API component khi đổi hình thức. Nếu thay default toàn cục phải kiểm tra tất cả consumer.

| Component | Hợp đồng cần giữ |
| --- | --- |
| `GlassView` | ViewProps/ref, opaque, blurTarget, intensity, padding, cornerRadius, shadow; style ở lớp ngoài, contentContainerStyle ở lớp nội dung. |
| `GlassCard` | GlassView props, title/description và heading semantics. Mục tiêu content surface đặc, shadow none; default runtime hiện vẫn soft shadow. |
| `GlassButton` | label, primary/glass variant, loading/loadingLabel, disabled, fullWidth, ref/sự kiện Pressable; giữ busy/disabled/focus và tên truy cập. |
| `GlassInput` | label, helperText/error, ref/TextInput props; giữ autofill, keyboard, focus, nhãn/lỗi và trạng thái không sửa được. |
| `GlassStatCard` | label/value/detail/unit/tone/loading/unavailable; null/error không đổi thành 0. Tone tuân theo chính sách màu mới, vẫn giữ ý nghĩa trạng thái. |

Fallback hiện có: Android cần blur target hợp lệ; trường hợp không hỗ trợ, nested glass, opaque hoặc Reduce Transparency dùng nền đặc. Giữ cơ chế này khi đổi palette. Không thêm native dependency trong tác vụ tài liệu.

Appearance mặc định `system`; lưu `system`/`light`/`dark` qua provider với key `grainledger.appearance.v1`. Hydrate trước khi hiển thị để tránh nháy sai theme. Navigation, system bars, input, modal và trạng thái loading/error dùng cùng resolved theme. Giữ xử lý lỗi lưu/retry; không tạo provider/preference riêng theo feature.

## 10. Khả năng tiếp cận và nghiệm thu

Mục tiêu dự án: chữ thường tương phản ít nhất 4.5:1; icon/control thiết yếu ít nhất 3:1. Tính trên nền thực tế cả hai mode, gồm pressed/selected và surface tổng hợp. Separator trang trí không thay thế biên control cần nhận diện. Đo lại khi triển khai và kiểm tra chế độ tăng tương phản.

Có nhãn cùng trạng thái, thứ tự đọc hợp lý và tên truy cập cho nút icon. Hỗ trợ VoiceOver/TalkBack, chữ lớn, focus bàn phím và giảm hiệu ứng. Tham khảo [Apple HIG — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility.md).

Trước khi đánh dấu giao diện đã chuyển đổi:

- Kiểm tra Light/Dark/System, khởi động lại và đổi theme khi màn đang mở.
- Kiểm tra điện thoại hẹp khoảng 375 logical units, máy lớn/tablet và chữ lớn khoảng 200%; không cắt tên lô, đơn vị, số dư hoặc nhãn nút.
- Kiểm tra safe area, bàn phím, tab bar, Back/swipe-back/direct link; giữ ngữ cảnh form và bộ lọc.
- Kiểm tra selected/pressed/focus/disabled/loading, empty/missing/403/404/error/retry và thành công thực.
- Đo contrast, kiểm tra Reduce Motion/Reduce Transparency và cuộn danh sách dài trên iOS/Android.
- Chạy `npx --no-install tsc --noEmit`, `npx --no-install expo lint` và script hồi quy phù hợp. Screenshot/device review là bước riêng, không suy ra từ bundle/fixture pass.

## 11. Khoảng cách với giao diện hiện tại

| Hiện tại | Hướng chuyển đổi khi được giao tác vụ triển khai |
| --- | --- |
| Token chung còn nền xanh, amber/info và ambient gradient | Chuyển sang palette trung tính và chính sách xanh nhấn ở mục 3; ánh xạ token cũ theo vai trò, giữ tương thích consumer. |
| GlassCard/GlassButton có bóng, một số vùng blur/gradient | Điều chỉnh content/defaults tập trung, giảm trang trí và kiểm tra tất cả nơi dùng. |
| Landing có neutral palette riêng | Hợp nhất token, bỏ cấu hình trùng sau khi kiểm tra hai theme. |
| Dashboard/Stock dùng Glass/stat cards | Grouped hierarchy, số liệu trung tính, trạng thái/CTA có nhấn tiết chế; giữ API, quyền, decimal và phạm vi dữ liệu. |
| Theme/navigation/fixtures cũ đã pass | Là baseline bản cũ. Script contrast cũ chưa chứng minh palette đề xuất hay trải nghiệm native mới đã nghiệm thu. |

Thực hiện từng thay đổi nhỏ có thể kiểm chứng; không đồng thời sửa API hoặc mở rộng nghiệp vụ do thay đổi trình bày. Tài liệu này không tự cho phép chuyển đổi hàng loạt màn hình. Theo tác vụ kế tiếp được giao, cập nhật token/component hoặc một màn hình, xác minh rồi cập nhật PROGRESS.

Kiểm chứng lần cập nhật tài liệu: 46 cặp màu đặc đề xuất đạt ngưỡng, tối thiểu chữ 4.77:1 và biên control 4.03:1. TypeScript, Expo lint và kiểm tra whitespace pass. Kết quả màu này chưa bao gồm translucency, trạng thái pressed thực tế hoặc nghiệm thu trên thiết bị; runtime chưa được đổi theo đặc tả.

# Test case chức năng web GrainLedger

## Phạm vi và cách chạy

Tài liệu được lập từ các route và xử lý hiện có trong `src/app/router/routes.tsx` và `src/features` (09/11/2026). Đây là **test case thủ công**, chưa phải kết quả chạy test. Cột “Kết quả thực tế” và “Trạng thái” để người kiểm thử điền khi thực thi. Các ca có nhãn **UI mô phỏng** chỉ kiểm tra trạng thái trên trình duyệt; dữ liệu không được bảo đảm lưu sau khi tải lại trang.

**Điều kiện chung:** chạy web và API theo cấu hình dự án; chuẩn bị tài khoản cho các vai trò MA (MILL_ADMIN), MM (MILL_MANAGER), MO (MILL_OPERATOR), PO (CUSTOMER_PROCUREMENT_OFFICER), CM (CUSTOMER_MANAGER), EO (CUSTOMER_EXPORT_OFFICER), SV (AUTHORIZED_STOCK_VIEWER). Chuẩn bị ít nhất một tổ chức, nông hộ, thửa, lô, địa điểm, hoạt chất, thị trường, mẫu và tác vụ tiếp nhận hợp lệ. Dùng dữ liệu riêng cho các ca tạo/xóa; khôi phục dữ liệu sau mỗi ca thay đổi trạng thái. Các mã và giá trị ví dụ phải thay bằng ID thực tế của môi trường kiểm thử.

**Quy ước:** P1 = luồng chính/ảnh hưởng dữ liệu hoặc phân quyền; P2 = kiểm tra phụ. Mỗi hàng là một ca độc lập. “API thành công” nghĩa là endpoint trả thành công và dữ liệu có thể nạp lại; khi chỉ có UI mô phỏng, kỳ vọng được giới hạn trong phiên trang hiện tại.

| ID | Mức | Vai trò / route | Tình huống và bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| AUTH-01 | P1 | Khách / `/sign-in` | Nhập email, mật khẩu hợp lệ (≥8 ký tự), bấm Đăng nhập. | Đăng nhập thành công, chuyển tới trang mặc định theo vai trò; phiên được lưu theo lựa chọn “Ghi nhớ”. |  | Chưa chạy |
| AUTH-02 | P1 | Khách / `/sign-in` | Để trống email hoặc nhập email sai định dạng rồi gửi form. | Hiện lỗi đúng trường; không gọi đăng nhập. |  | Chưa chạy |
| AUTH-03 | P1 | Khách / `/sign-in` | Nhập mật khẩu dưới 8 ký tự rồi gửi form. | Hiện lỗi độ dài; không gọi đăng nhập. |  | Chưa chạy |
| AUTH-04 | P1 | Khách / `/sign-in` | Nhập thông tin sai khi API xác thực hoạt động. | Hiện thông báo lỗi từ xác thực; vẫn ở trang đăng nhập. |  | Chưa chạy |
| AUTH-05 | P1 | Khách / route bảo vệ | Mở trực tiếp `/stock?x=1`, đăng nhập thành công. | Chuyển tới `/sign-in` với `returnUrl`, sau đăng nhập quay lại `/stock?x=1`. |  | Chưa chạy |
| AUTH-06 | P1 | SV / `/admin/customers` | Đăng nhập SV, mở trực tiếp route chỉ dành cho MA. | Hiện màn hình không có quyền; nút về trang chủ hoạt động; không hiện nội dung quản trị. |  | Chưa chạy |
| AUTH-07 | P2 | Người đã đăng nhập / `/sign-in` | Truy cập lại trang đăng nhập. | Tự chuyển tới `/home` hoặc `returnUrl` hợp lệ. |  | Chưa chạy |
| AUTH-08 | P2 | Khách / `/forgot-password` | Nhập email hợp lệ và gửi yêu cầu. | Hiện thông báo đã tiếp nhận; không tiết lộ email có tồn tại trong hệ thống. |  | Chưa chạy |
| AUTH-09 | P2 | Khách / `/forgot-password` | Để trống hoặc nhập email sai định dạng. | Trình duyệt chặn gửi; không gọi API. |  | Chưa chạy |
| AUTH-10 | P1 | Khách / `/invite/:token` | Mở token lời mời hợp lệ, đặt mật khẩu ≥12 ký tự có chữ hoa, chữ thường, số, ký tự đặc biệt; xác nhận trùng khớp. | Lời mời được chấp nhận và giao diện báo thành công/chuyển hướng theo luồng. |  | Chưa chạy |
| AUTH-11 | P1 | Khách / `/invite/:token` | Dùng token không hợp lệ hoặc hết hạn. | Hiện trạng thái lỗi token; không cho hoàn tất đăng ký. |  | Chưa chạy |
| AUTH-12 | P1 | Khách / `/invite/:token` | Thử mật khẩu thiếu một loại ký tự, dưới 12 ký tự hoặc xác nhận không khớp. | Hiện lỗi tương ứng; không gửi yêu cầu chấp nhận lời mời. |  | Chưa chạy |
| AUTH-13 | P2 | Người đăng nhập / `/settings/profile` | Đổi tên hiển thị, số điện thoại hợp lệ và ngôn ngữ; lưu, nạp lại trang. | Thông tin cập nhật được hiển thị lại từ hồ sơ. |  | Chưa chạy |
| AUTH-14 | P2 | Người đăng nhập / `/settings/profile` | Nhập tên dưới 2 hoặc trên 120 ký tự, hay số điện thoại sai định dạng. | Hiện lỗi xác thực; không lưu hồ sơ. |  | Chưa chạy |
| AUTH-15 | P1 | Người đăng nhập / `/settings/security` | Nhập mật khẩu hiện tại đúng, mật khẩu mới hợp lệ và xác nhận trùng. | Đổi mật khẩu thành công theo phản hồi API. |  | Chưa chạy |
| AUTH-16 | P1 | Người đăng nhập / `/settings/security` | Nhập mật khẩu mới trùng mật khẩu cũ, yếu hoặc xác nhận khác. | Hiện lỗi tương ứng; không gửi cập nhật. |  | Chưa chạy |
| AUTH-17 | P1 | Người đăng nhập / route bảo vệ | Mô phỏng access token hết hạn, refresh token hợp lệ rồi gọi API bảo vệ. | Phiên được cấp token mới và yêu cầu tiếp tục; trường hợp refresh bị từ chối 401/403 thì đăng xuất. |  | Chưa chạy |
| AUTH-18 | P2 | Người đăng nhập / route bảo vệ | Mất mạng khi cần refresh token. | Không tự đăng xuất chỉ vì lỗi mạng; giao diện báo mất kết nối. |  | Chưa chạy |

## Quản trị và danh mục

| ID | Mức | Vai trò / route | Tình huống và bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| ADM-01 | P1 | MA / `/admin/customers` | Tạo tổ chức với tên hợp lệ, chọn loại Customer hoặc Mill. | Thông báo thành công; tổ chức xuất hiện sau khi tải lại danh sách. |  | Chưa chạy |
| ADM-02 | P2 | MA / `/admin/customers` | Để trống tên tổ chức rồi gửi. | Không tạo bản ghi; form không đóng như một thao tác thành công. |  | Chưa chạy |
| ADM-03 | P1 | MA / `/admin/access` | Tìm người dùng, sửa vai trò, tổ chức và trạng thái hoạt động, lưu. | Danh sách hiển thị giá trị mới sau khi tải lại; API lỗi/ETag xung đột được báo. |  | Chưa chạy |
| ADM-04 | P1 | MA / `/admin/facilities` | Tạo, sửa rồi xóa từng loại cấu hình nhà máy được giao diện hỗ trợ. | Danh sách được cập nhật sau mỗi thao tác; xóa chỉ xảy ra sau xác nhận. |  | Chưa chạy |
| ADM-05 | P1 | MA/MM / `/admin/receiving-thresholds` | Thêm/sửa ngưỡng sai lệch cân, độ ẩm tối đa và tạp chất cho một doanh nghiệp. | Giá trị được lưu đúng cho doanh nghiệp đã chọn sau khi tải lại. |  | Chưa chạy |
| ADM-06 | P1 | MA/MM / `/admin/receiving-thresholds` | Xóa ngưỡng riêng, xác nhận xóa. | Dòng ngưỡng riêng biến mất; hệ thống áp dụng ngưỡng mặc định theo phản hồi API. |  | Chưa chạy |
| ADM-07 | P2 | MA/MM / `/admin/receiving-thresholds` | Bấm xóa rồi hủy hộp xác nhận. | Không gọi thao tác xóa; ngưỡng giữ nguyên. |  | Chưa chạy |
| ADM-08 | P1 | MA/MM / `/admin/balance-policy` | Chỉnh cấu hình chính sách cân bằng và lưu tất cả. | Giá trị lưu được nạp lại; thông báo thành công. |  | Chưa chạy |
| ADM-09 | P2 | MA/MM / `/admin/balance-policy` | Thêm quy tắc phối trộn có giống nguồn/đích hợp lệ, sau đó thử xóa và hủy xác nhận. | Quy tắc mới xuất hiện; hủy xác nhận giữ nguyên dòng. |  | Chưa chạy |
| CAT-01 | P1 | MA / `/admin/master-data` | Lần lượt tạo và sửa Commodity, Unit, Substance, Market, Variety, Attribute. | Mỗi danh mục hiển thị dữ liệu mới sau tải lại và tên/thuộc tính đã sửa. |  | Chưa chạy |
| CAT-02 | P1 | MA / `/admin/master-data` | Xóa một Commodity, Unit, Substance không bị tham chiếu. | Có hộp xác nhận; sau xác nhận mục bị xóa và danh sách cập nhật. |  | Chưa chạy |
| CAT-03 | P2 | MA / `/admin/master-data` | Tìm theo mã/tên, chuyển tab danh mục. | Chỉ hiển thị mục khớp và tab hiện tại; không lẫn dữ liệu tab khác. |  | Chưa chạy |
| CAT-04 | P1 | MA/CM/EO / `/compliance/mrl-versions` | Tạo phiên bản MRL cho thị trường hợp lệ; thêm giới hạn hoạt chất. | Phiên bản và ngưỡng mới hiển thị trong danh sách/chi tiết. |  | Chưa chạy |
| CAT-05 | P1 | MA/CM/EO / `/compliance/mrl-versions` | Xóa một ngưỡng ở phiên bản phù hợp, xác nhận; sau đó thử hủy xóa ngưỡng khác. | Xóa đúng ngưỡng đã xác nhận; ngưỡng bị hủy thao tác vẫn còn. |  | Chưa chạy |
| CAT-06 | P1 | MA/CM/EO / `/compliance/mrl-versions` | Công bố phiên bản MRL và xác nhận. | Trạng thái phiên bản được cập nhật theo API; hủy xác nhận không công bố. |  | Chưa chạy |
| CAT-07 | P2 | MA/CM/EO / `/compliance/mrl-versions` | Import dữ liệu MRL bằng đầu vào hợp lệ và đầu vào lỗi. | Thành công thì danh sách được cập nhật; thất bại thì hiện lỗi và không báo thành công. |  | Chưa chạy |

## Hiện trường và đồng bộ ngoại tuyến

| ID | Mức | Vai trò / route | Tình huống và bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| FLD-01 | P1 | PO/MA / `/field/farmers/new` | Tạo nông hộ với tên hợp lệ; sửa thông tin nông hộ. | Dòng mới/giá trị sửa xuất hiện sau khi tải lại danh sách. |  | Chưa chạy |
| FLD-02 | P2 | PO/MA / `/field/farmers/new` | Để trống tên nông hộ rồi gửi; tìm theo tên/mã. | Không tạo bản ghi rỗng; tìm kiếm chỉ hiện mục khớp. |  | Chưa chạy |
| FLD-03 | P1 | PO/MA / `/field/farmers/new` | Xóa nông hộ thử nghiệm; chạy lại với Hủy trong hộp xác nhận. | Chỉ lần xác nhận xóa làm mất dòng; lần hủy giữ nguyên. |  | Chưa chạy |
| FLD-04 | P1 | PO/MA / `/field/plots/new` | Chọn nông hộ, nhập thông tin thửa hợp lệ rồi tạo/sửa. | Thửa gắn đúng nông hộ; dữ liệu sửa hiện sau tải lại. |  | Chưa chạy |
| FLD-05 | P1 | PO/MA / `/field/plots/new` | Không chọn nông hộ rồi gửi; lọc danh sách theo nông hộ và từ khóa. | Hiện lỗi yêu cầu chọn nông hộ; bộ lọc trả đúng thửa. |  | Chưa chạy |
| FLD-06 | P2 | PO/MA / `/field/plots/new` | Xóa thửa thử nghiệm, kiểm tra cả xác nhận và hủy. | Chỉ xóa khi xác nhận; lỗi API được hiển thị nếu thửa đang bị tham chiếu. |  | Chưa chạy |
| FLD-07 | P1 | PO/MA / `/field/declarations/new` | Khai báo lần phun với vụ thửa, ngày, tên thuốc, hoạt chất, liều và nguồn thông tin hợp lệ. | Hiện thông báo ghi nhận; khai báo xuất hiện trong danh sách sau nạp lại. |  | Chưa chạy |
| FLD-08 | P1 | PO/MA / `/field/receipts/new` | Chọn nông hộ và dữ liệu cân hợp lệ, tạo phiếu khi online. | API ghi nhận thành công; có thông báo chứa khối lượng; phiếu hiển thị sau tải lại. |  | Chưa chạy |
| FLD-09 | P1 | PO/MA / `/field/receipts/new` | Không chọn nông hộ rồi gửi. | Hiện lỗi yêu cầu chọn nông hộ; không tạo phiếu. |  | Chưa chạy |
| FLD-10 | P1 | PO/MA / `/field/receipts/new` | Ngắt mạng trước khi tạo phiếu, gửi phiếu hợp lệ. | Phiếu lưu vào hàng đợi trên thiết bị, hiện thông báo offline; số phiếu chờ tăng. |  | Chưa chạy |
| FLD-11 | P1 | PO/MA / `/field/receipts/new` | Bắt đầu gửi lúc online rồi làm mất kết nối trước phản hồi. | Phiếu được đưa vào hàng đợi với cùng mã thao tác; không mất dữ liệu. |  | Chưa chạy |
| FLD-12 | P1 | PO/MA / `/field/sync` | Khôi phục mạng, bấm Đồng bộ với phiếu đang chờ. | Phiếu gửi thành công bị xóa khỏi hàng đợi; số phiếu chờ cập nhật; không tạo trùng khi thử lại. |  | Chưa chạy |
| FLD-13 | P2 | PO/MA / `/field/sync` | Vào trang khi offline hoặc hàng đợi rỗng. | Nút Đồng bộ bị vô hiệu; trạng thái mạng/rỗng hiển thị đúng. |  | Chưa chạy |
| FLD-14 | P1 | PO/MA / `/field/samples/new` | Tạo mẫu hiện trường với mã mẫu, mã niêm phong, lô nguồn hợp lệ. | Mẫu xuất hiện trạng thái niêm phong; dữ liệu lấy lại từ API sau tải lại. |  | Chưa chạy |
| FLD-15 | P1 | PO/MA / `/field/samples/new` | Để trống mã mẫu hoặc mã niêm phong rồi gửi. | Không tạo mẫu; form vẫn mở. |  | Chưa chạy |
| FLD-16 | P1 | PO/MA / `/field/samples/new` | Mở mẫu đã niêm phong, ghi bàn giao với bên gửi/nhận, tình trạng niêm phong và phòng lab. | Bàn giao được ghi nhận; trạng thái mẫu cập nhật sang đã giao phòng lab. |  | Chưa chạy |

## Nhà máy, tồn kho và lịch sử

| ID | Mức | Vai trò / route | Tình huống và bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| MILL-01 | P1 | MO/MM/MA / `/mill/receiving` | Chọn tác vụ tiếp nhận, nhập số cân và độ ẩm hợp lệ rồi lưu. | Tác vụ được cập nhật sau tải lại; có thông báo ghi số cân. |  | Chưa chạy |
| MILL-02 | P1 | MO/MM/MA / `/mill/receiving` | Mở tác vụ cần đối soát, chọn duyệt khớp hoặc từ chối chênh lệch. | API nhận đúng quyết định; trạng thái tác vụ cập nhật sau tải lại. |  | Chưa chạy |
| MILL-03 | P1 | MO/MM/MA / `/mill/operations/new` | Chọn lô khả dụng, loại chế biến và nhập tổng đầu ra + hao hụt bằng đầu vào; ghi sổ. | Trạng thái cân bằng và mã giao dịch hiển thị; kiểm tra API và sổ cái để xác nhận bút toán thật. |  | Chưa chạy |
| MILL-04 | P1 | MO/MM/MA / `/mill/operations/new` | Nhập tổng đầu ra + hao hụt khác đầu vào rồi ghi sổ. | Giao diện từ chối ghi sổ và hiển thị trạng thái mất cân bằng. |  | Chưa chạy |
| MILL-05 | P1 | MO/MM/MA / `/mill/operations/new` | Chọn lô đầu vào đang HOLD rồi ghi sổ. | Giao diện từ chối ghi sổ; không tạo giao dịch. |  | Chưa chạy |
| MILL-06 | P2 | MO/MM/MA / `/mill/operations/new` | Sửa form, rời/trở lại trang; sau đó xóa bản nháp. | Bản nháp được khôi phục; thao tác xóa đưa form về mặc định. |  | Chưa chạy |
| MILL-07 | P1 | MO/MA / `/mill/corrections/new` | Nhập Operation ID, lý do, mô tả và các dòng chênh lệch hợp lệ; gửi. | Yêu cầu sửa đổi được tạo; xuất hiện trong danh sách đang chờ. |  | Chưa chạy |
| MILL-08 | P1 | MO/MA / `/mill/corrections/new` | Bỏ trống Operation ID hoặc lý do/mô tả kỹ thuật. | Hiện lỗi bắt buộc; không gửi yêu cầu. |  | Chưa chạy |
| MILL-09 | P1 | MO/MM/MA / `/mill/corrections/pending` | Chọn yêu cầu, nhập biên bản đối soát rồi duyệt/từ chối theo các lựa chọn giao diện. | Trạng thái yêu cầu được cập nhật đúng; thiếu biên bản thì không xử lý. |  | Chưa chạy |
| MILL-10 | P1 | MO/MM/MA / `/mill/corrections/pending` | Chốt bút toán bù cho yêu cầu đủ điều kiện; thử hủy thao tác ở hộp xác nhận. | Chỉ chốt khi xác nhận; dữ liệu trạng thái và sổ cái cập nhật theo API. |  | Chưa chạy |
| MILL-11 | P1 | MM/MA / `/mill/reconciliations` | Chọn mục đối soát, nhập kết luận rồi duyệt hoặc từ chối. | Thiếu kết luận bị chặn; khi UI báo thành công, kiểm tra API và tải lại để xác định quyết định đã được lưu thật. |  | Chưa chạy |
| MILL-12 | P1 | Người đăng nhập / `/stock` | Xem danh sách tồn kho, chọn một lô và mở chi tiết. | Hiển thị đúng khối lượng, trạng thái và thông tin chi tiết lô theo dữ liệu trả về. |  | Chưa chạy |
| MILL-13 | P2 | Người đăng nhập / `/stock/lots/:lotId` | Mở URL chi tiết lô có ID hợp lệ và không hợp lệ. | Ghi nhận lô nào được hiển thị; đánh lỗi nếu URL không chọn đúng lô hoặc không báo ID không tồn tại. |  | Chưa chạy |
| AUD-01 | P2 | Người đăng nhập / `/events` | Mở lịch sử sự kiện và dùng bộ lọc/tìm kiếm có sẵn. | Dòng sự kiện khớp tiêu chí; lỗi tải được thông báo. |  | Chưa chạy |
| AUD-02 | P2 | Người đăng nhập / `/events/:type/:id` | Mở lịch sử theo loại đối tượng và ID hợp lệ. | Ghi nhận bộ lọc thực tế; đánh lỗi nếu URL không giới hạn sự kiện theo đối tượng. |  | Chưa chạy |

## Kiểm định và rủi ro

| ID | Mức | Vai trò / route | Tình huống và bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| LAB-01 | P2 | CM/MA / `/compliance/lab-samples` | Tìm theo mã mẫu/mã niêm phong/mã lô/phòng lab, lọc trạng thái và mở chi tiết. **UI mô phỏng.** | Danh sách/chi tiết khớp dữ liệu mẫu trong phiên hiện tại. |  | Chưa chạy |
| LAB-02 | P2 | CM/MA / `/compliance/lab-samples/new` | Điền form đăng ký mẫu rồi gửi. **UI mô phỏng.** | Có banner thành công; mẫu mới ở đầu danh sách với trạng thái gửi lab trong phiên hiện tại. |  | Chưa chạy |
| LAB-03 | P2 | CM/MA / `/compliance/lab-samples` | Bấm in biên bản bàn giao trên một mẫu. **UI mô phỏng.** | Hiện hộp thoại chứa mã mẫu, seal, lô, lab và người lấy mẫu; chưa tạo file in. |  | Chưa chạy |
| LAB-04 | P2 | CM/MA / `/compliance/lab-results` | Xem mẫu đạt/vượt MRL và chi tiết hoạt chất. **UI mô phỏng.** | Trạng thái và các mức đo, giới hạn, biên an toàn hiển thị theo dữ liệu mẫu. |  | Chưa chạy |
| LAB-05 | P2 | CM/MA / `/compliance/lab-results` | Thêm mẫu có mã mẫu và mã lô; thử thiếu từng trường. **UI mô phỏng.** | Mẫu hợp lệ xuất hiện trạng thái chờ lab; thiếu trường báo lỗi, không thêm. |  | Chưa chạy |
| LAB-06 | P2 | CM/MA / `/compliance/safety-margin` | Chọn Tricyclazole/EU, buffer 20%, nhập 0.0075; sau đó 0.009 và 0.012 mg/kg. **UI mô phỏng.** | Lần lượt hiển thị SAFE PASS, cảnh báo biên an toàn, vượt MRL; ngưỡng an toàn là 0.008 mg/kg. |  | Chưa chạy |
| RISK-01 | P1 | CM/MA / `/risk/holds/new` | Nhập lô mục tiêu/lý do và ban hành HOLD; xác minh bản ghi ở API. | Có thông báo thành công và lệnh mới trong danh sách; kiểm tra ID lô thật được gắn đúng. |  | Chưa chạy |
| RISK-02 | P1 | MM/CM/EO/MA / `/risk/holds` | Mở một HOLD, ghi nhận phản hồi xử lý theo nút trên giao diện. | Phản hồi được lưu, trạng thái lệnh cập nhật sau tải lại. |  | Chưa chạy |
| RISK-03 | P2 | CM/EO/MA / `/risk/traceback` | Mở route truy vết hai chiều. | Hiện trang placeholder; chưa có chức năng truy vết để kiểm thử nghiệp vụ. |  | Chưa chạy |

## Lưu ý khi đánh giá kết quả

- Route `/export/*` và `/mill/plan-executions/:planId` hiện dùng `PlaceholderPage`; chưa lập test case nghiệp vụ tạo đơn hàng, phối trộn xuất khẩu, xếp/đóng container hoặc hồ sơ tuân thủ.
- `BidirectionalTracePage.tsx` cùng các thành phần truy vết đang là file chưa được theo dõi bởi Git và route `/risk/traceback` vẫn trỏ tới placeholder. Chỉ kiểm tra route hiện đang chạy, chưa coi truy vết là tính năng đã triển khai.
- `LabSampleRegistrationPage`, `MrlComplianceCheckPage` và `SafetyMarginPolicyPage` có dữ liệu hoặc xử lý mô phỏng trên giao diện. Không đánh dấu các ca này là tích hợp backend thành công chỉ vì UI hiển thị thành công.
- `OperationEntryPage` có nhánh vẫn hiện trạng thái đã ghi sau lỗi API ghi công đoạn; ca MILL-03 cần kiểm tra bản ghi thực tế trên backend. `HoldManagementPage` đang gửi `lotId` ngẫu nhiên khi tạo HOLD; ca RISK-01 cần xác minh liên kết lô thực tế. Đây là hai điểm có nguy cơ sai lệch giữa thông báo UI và dữ liệu đã lưu.
- `ReconciliationReviewPage` có xử lý dữ liệu cục bộ và bỏ qua lỗi API ở một nhánh duyệt; ca MILL-11 phải đối chiếu sau tải lại. Route chi tiết tồn kho và route lịch sử theo đối tượng hiện dùng chung trang danh sách, chưa thấy xử lý tham số URL; MILL-13 và AUD-02 là ca xác nhận khoảng trống này.

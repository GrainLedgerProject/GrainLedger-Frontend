# Automated test case web GrainLedger

Chạy từ thư mục `web/grainledger`:

```bash
npm ci
npm test
```

`npm run test:watch` dùng khi phát triển. Bộ test dùng Vitest, React Testing Library, jsdom và IndexedDB giả lập; không cần backend hoặc tài khoản thật. Các trường hợp bên dưới đối chiếu với [bộ test case thủ công](TEST_CASES_WEB.md).

| Nhóm | Test case thủ công liên quan | Ca tự động | Tệp |
|---|---|---|---|
| Xác thực form | AUTH-02, AUTH-03, AUTH-12, AUTH-14, AUTH-16 | Email/mật khẩu đăng nhập; mật khẩu lời mời; đổi mật khẩu; hồ sơ | `tests/auth-and-mass.test.ts` |
| JWT và vai trò | AUTH-17, AUTH-18 | Giải mã token, thời điểm hết hạn, chuẩn hóa vai trò | `tests/auth-and-mass.test.ts` |
| Phân quyền route | AUTH-05, AUTH-06 | Giữ `returnUrl`, từ chối SV, cho phép MA | `tests/protected-route.test.tsx` |
| Cân bằng khối lượng | MILL-03, MILL-04 | Khối lượng cân bằng, biên dung sai, sai lệch vượt ngưỡng, độ chính xác số thập phân | `tests/auth-and-mass.test.ts` |
| Thu mua offline | FLD-10 đến FLD-13 | Lưu theo mã thao tác, chặn sync offline, xóa sau thành công, giữ lỗi để thử lại, xử lý đồng bộ một phần | `tests/procurement-queue.test.ts` |

**Giới hạn:** các test này kiểm tra logic phía web. Chúng chưa xác nhận API thật, quyền từ backend, ghi sổ cái, hoặc hành vi xuyên nhiều trình duyệt. Các ca CRUD, tiếp nhận, HOLD, lab và các ca có rủi ro UI báo thành công khi API chưa lưu vẫn cần chạy trên môi trường tích hợp theo `TEST_CASES_WEB.md`.

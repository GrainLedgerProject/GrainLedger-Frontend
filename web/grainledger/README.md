# React + TypeScript + Vite

## Cấu hình môi trường

Sao chép `.env.example` thành `.env` trước khi chạy frontend:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Rỗng | Origin backend, không kèm `/api`. Để rỗng để gọi cùng origin; khi chạy dev, Vite chuyển tiếp qua proxy. |
| `API_PROXY_TARGET` | `http://localhost:5080` | Backend mà proxy dev chuyển tiếp các đường dẫn `/api`, `/health`, `/signin-google` tới. |
| `DEV_PORT` | `5173` | Cổng chạy frontend khi phát triển. |

Khi triển khai với backend riêng, đặt `VITE_API_BASE_URL=https://api.example.com` trước khi chạy `npm run build`; backend cần cho phép CORS và cookie từ origin frontend. Nếu để rỗng khi triển khai, web server cần chuyển tiếp các đường dẫn backend trên vì proxy Vite chỉ hoạt động khi phát triển.

Khởi động lại dev server sau khi sửa `.env`. Các biến `VITE_*` được đưa vào mã trình duyệt khi build, vì vậy không đặt thông tin bí mật trong các biến này. `.env` và các file môi trường riêng được Git bỏ qua; `.env.example` được lưu trong repository.

## Đồng bộ API

Đặc tả được lưu tại `openapi/v1.json`. Sau khi cập nhật đặc tả, chạy `npm run api:generate` để sinh schema, operation và manifest. Chạy `npm run api:check` để kiểm tra mã sinh, `npm run api:audit` để kiểm tra wrapper theo method/path.

Xem [kết quả đối soát API và giao diện](docs/api-reconciliation.md) để biết endpoint mới, interface bổ sung và giới hạn của đặc tả.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

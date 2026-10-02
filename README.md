## 📁 Project Structure

```text
src/
│
├── app/
│   ├── AppProviders.jsx
│   ├── AppRouter.jsx
│   └── queryClient.js
│
├── assets/
│   ├── images/
│   └── icons/
│
├── components/
│   ├── common/
│   └── ui/
│
├── constants/
│   ├── permissions.js
│   └── routes.js
│
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   │
│   ├── enterprise/
│   ├── tenant/
│   ├── user/
│   ├── group/
│   ├── role/
│   ├── product/
│   ├── customer/
│   ├── invoice/
│   └── payment/
│
├── hooks/
│
├── layouts/
│   └── DashboardLayout.jsx
│
├── pages/
│   ├── DashboardPage.jsx
│   └── NotFoundPage.jsx
│
├── routes/
│   ├── ProtectedRoute.jsx
│   └── PermissionRoute.jsx
│
├── services/
│   └── httpClient.js
│
├── stores/
│   ├── auth.store.js
│   ├── tenant.store.js
│   └── ui.store.js
│
├── utils/
│
├── index.css
└── main.jsx

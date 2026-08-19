# TransitRoute authentication testing

Admin: `admin@transitroute.in` / `Transit@2026!`
Customer: `customer@example.com` / `Customer@2026!`

Endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
Expected: admin receives role `admin`, customer receives role `customer`; `/api/dashboard` rejects customers with 403; authenticated cookies are httpOnly.
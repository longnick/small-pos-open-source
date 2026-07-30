# Demo seed contract

`src/data/demo-seed.ts` is repository source for non-production demo-only seed data. Keep this data unintegrated until persistence phase: no UI, DB, store, storage, or runtime wiring.

## Tenant

| Field | Value |
| --- | --- |
| `id` | `tenant-demo` |
| `name` | `Quán Demo` |
| `address` | `123 Đường ABC, Phường 1, TP.HCM` |
| `phone` | `0901234567` |
| `currency` | `VND` |
| `tableCount` | `5` |

## Groups

| ID | Name |
| --- | --- |
| `drinks` | `Nước uống` |
| `food` | `Đồ ăn` |

## Catalog

| ID | Group | Name | Price (VND) |
| --- | --- | --- | ---: |
| `coffee-black` | `drinks` | `Cà phê đen` | 25,000 |
| `lemon-tea` | `drinks` | `Trà chanh` | 20,000 |
| `fried-rice` | `food` | `Cơm rang` | 45,000 |
| `stir-fried-noodles` | `food` | `Mì xào` | 40,000 |
| `water` | `drinks` | `Nước suối` | 10,000 |

## Staff

| ID | Name | Demo PIN | Role |
| --- | --- | --- | --- |
| `manager` | `Manager` | `0000` | `manager` |
| `cashier` | `Thu ngân` | `1111` | `cashier` |
| `staff-a` | `Nhân viên A` | `2222` | `staff` |
| `kitchen` | `Bếp` | `3333` | `kitchen` |

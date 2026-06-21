# Removed Files Log - Clinic OS Rebuild

This document logs all files deleted during the repository cleanup phase and specifies the rationale for each deletion.

---

## 1. Backend Scripts
| File Name | Location | Rationale |
| :--- | :--- | :--- |
| `inspect_columns_employees.js` | `backend/` | Temporary diagnostics script, no longer needed. |
| `inspect_db.js` | `backend/` | Temporary diagnostics script, no longer needed. |
| `merge_translations.js` | `backend/` | Temporary translation utility. Logic mapped in localization. |
| `search_doctor_draft.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_endpoints.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_reception.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_render.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_render_nav.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_tab_code.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_tabs.js` | `backend/` | Obsolete search logic draft. |
| `search_doctor_useeffects.js` | `backend/` | Obsolete search logic draft. |
| `search_overlap.js` | `backend/` | Obsolete search logic draft. |
| `search_scratch.js` | `backend/` | Obsolete search logic draft. |
| `search_translations_admin.js` | `backend/` | Obsolete search logic draft. |
| `test_anon_connection.js` | `backend/` | Deprecated test script. |
| `test_db_inspect.js` | `backend/` | Deprecated test script. |
| `test_db_verbose.js` | `backend/` | Deprecated test script. |

---

## 2. Backend Routes and Services
| File Name | Location | Rationale |
| :--- | :--- | :--- |
| `admin.js` | `backend/routes/` | Replaced by decomposed `auth`, `support`, and `member` routes. |
| `adminChannels.js` | `backend/routes/` | Replaced by decomposed support conversation routes. |
| `adminDashboard.js` | `backend/routes/` | Replaced by centralized role statistics controller. |
| `ai.js` | `backend/routes/` | Replaced by clean `aiController.js` and `aiService.js`. |
| `auditLogs.js` | `backend/routes/` | Replaced by support logs routes. |
| `emailService.js` | `backend/routes/` | Replaced by separate email configuration routes. |
| `organizationApplications.js` | `backend/routes/` | Replaced by separate `appController.js`. |
| `organizationStructure.js` | `backend/routes/` | Replaced by decomposed specialty, department, room, and schedule routes. |
| `organizations.js` | `backend/routes/` | Replaced by separate `orgController.js`. |
| `pharmacy.js` | `backend/routes/` | Replaced by separate `medicineController.js`. |
| `superAdminDashboard.js` | `backend/routes/` | Replaced by support stats module. |
| `adminAuditService.js` | `backend/services/` | Replaced by support log service. |
| `adminChannelService.js` | `backend/services/` | Replaced by support conversation service. |
| `adminService.js` | `backend/services/` | Replaced by decomposed profiles and authorization services. |
| `auditLogService.js` | `backend/services/` | Replaced by support log service. |
| `emailService.js` | `backend/services/` | Replaced by central `emailService.js`. |
| `geminiService.js` | `backend/services/` | Replaced by decomposed `aiService.js`. |
| `itekaParser.js` | `backend/services/` | Replaced by decomposed `medicineService.js` and `pharmacyService.js`. |
| `organizationApplicationService.js` | `backend/services/` | Replaced by `appService.js`. |
| `patientService.js` | `backend/services/` | Replaced by booking and medical services. |
| `superAdminDashboardService.js` | `backend/services/` | Replaced by support dashboard services. |

---

## 3. Frontend Layouts, Organization and Pages
| File Name | Location | Rationale |
| :--- | :--- | :--- |
| `GovClinicLayout.jsx` | `frontend/src/organization/govClinic/` | Deprecated organization layout. Chief/registrar pages removed. |
| `GovClinicSystemAdmin.jsx` | `frontend/src/organization/govClinic/` | Replaced by clean `OrganizationAdmin` layout/pages. |
| `GovClinicEmployee.jsx` | `frontend/src/organization/govClinic/` | Replaced by clean `Doctor` layout/pages. |
| `AdminApplications.jsx` | `frontend/src/pages/` | Replaced by decomposed Support pages. |
| `AdminAuditLogs.jsx` | `frontend/src/pages/` | Replaced by support logs screen. |
| `AdminChannels.jsx` | `frontend/src/pages/` | Replaced by support chat screen. |
| `AdminDashboard.jsx` | `frontend/src/pages/` | Replaced by decomposed Support home page. |
| `AdminLayout.jsx` | `frontend/src/pages/` | Replaced by clean Support layout. |
| `AdminLogin.jsx` | `frontend/src/pages/` | Consolidated into main auth/login page. |
| `AdminOrganizations.jsx` | `frontend/src/pages/` | Replaced by support organizations screen. |
| `AdminRoles.jsx` | `frontend/src/pages/` | Role setup is now statically defined in profiles schema. |
| `AdminStaff.jsx` | `frontend/src/pages/` | Replaced by admin doctor management screen. |
| `AiAssistantPage.jsx` | `frontend/src/pages/` | Replaced by patient AI assistant panel. |
| `BookAppointmentPage.jsx` | `frontend/src/pages/` | Replaced by decomposed Patient booking sub-pages. |
| `Documents.jsx` | `frontend/src/pages/` | Replaced by medical documents panel. |
| `DocumentsCloudPage.jsx` | `frontend/src/pages/` | Replaced by medical card documents page. |
| `DocumentsPage.jsx` | `frontend/src/pages/` | Replaced by certificates page. |
| `HealthPage.jsx` | `frontend/src/pages/` | Replaced by patient health monitoring tab. |
| `HomePage.jsx` | `frontend/src/pages/` | Replaced by patient home dashboard screen. |
| `Login.jsx` | `frontend/src/pages/` | Replaced by unified Login page. |
| `OrganizationApplication.jsx` | `frontend/src/pages/` | Replaced by Support organization signup screen. |
| `OrganizationLogin.jsx` | `frontend/src/pages/` | Consolidated into main auth page. |
| `Passport.jsx` | `frontend/src/pages/` | Replaced by Patient Profile page. |
| `Search.jsx` | `frontend/src/pages/` | Redundant medicine search page. |
| `VisitsHistoryPage.jsx` | `frontend/src/pages/` | Replaced by patient records dashboard. |

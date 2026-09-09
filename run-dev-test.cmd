@echo off
cd /d c:\Users\varun\TECHX-FEEDBACK-26
set "ADMIN_USERNAME=vcet-nsdc"
set "ADMIN_PASSWORD=audit-test-pw"
set "ADMIN_SESSION_SECRET=test-session-secret"
call npx next dev -p 3001 > dev-server.log 2>&1

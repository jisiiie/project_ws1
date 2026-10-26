TURATZ CAFE - MORIAH POS  (HTML + CSS + JavaScript + PHP + MySQL)

SETUP (XAMPP / any PHP 8.1+ host)
1. Copy the turatz-pos folder to htdocs (or public_html).
2. Import database.sql in phpMyAdmin.
3. Open config.php and set:
   - DB_USER / DB_PASS if different from XAMPP defaults
   - ADMIN_CODE and CASHIER_CODE (the access code typed on the Register form decides the role;
     change both and share each only with the right people)
4. Open http://localhost/turatz-pos/ and log in with a ready-made account:
     admin / admin123  (Admin)     cashier / cashier123  (Cashier)
   Change these passwords after your first login. New people can press Register with a code.
   The owner/manager registers with the Admin code, the cashier with the Cashier code.
   Admin: Orders, Products, Users, Sales Records, Reports.  Cashier: Orders and Sales Records (search).
Use HTTPS when deployed online.

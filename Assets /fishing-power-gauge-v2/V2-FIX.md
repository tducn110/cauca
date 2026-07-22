# V2 fix

Bản cũ bị rách viền vì ảnh nguồn có nền trắng, trong khi viền và chữ cũng màu trắng.
Thuật toán tách nền tự động không phân biệt được đâu là nền và đâu là chi tiết.

Bản V2:
- dùng mask hình học sạch;
- không còn mảng trắng rách hai bên;
- có bản 1x và 2x;
- pivot nằm đúng tâm ảnh.

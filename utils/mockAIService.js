import AIGuide from '../models/aiGuide.models.js';

// Mock responses based on user role and message
const MOCK_RESPONSES = {
  user: {
    // Booking & Scheduling
    "đặt lịch": "🎯 **HƯỚNG DẪN ĐẶT LỊCH HẸN**\n\n1️⃣ **Chọn bác sĩ**: Từ danh sách bác sĩ có sẵn\n2️⃣ **Chọn thời gian**: Ngày và giờ phù hợp với bạn\n3️⃣ **Điền thông tin**: Ghi chú và thông tin cần thiết\n4️⃣ **Xác nhận**: Kiểm tra lại và xác nhận đặt lịch\n\n💡 **Lưu ý**: Bạn có thể đặt lịch online hoặc offline tùy theo nhu cầu!",
    "huỷ lịch": "❌ **HƯỚNG DẪN HUỶ LỊCH HẸN**\n\n1️⃣ **Vào lịch sử**: Truy cập trang lịch sử đặt lịch\n2️⃣ **Tìm lịch**: Tìm lịch hẹn bạn muốn huỷ\n3️⃣ **Click huỷ**: Nhấn nút 'Huỷ lịch'\n4️⃣ **Nhập lý do**: Giải thích lý do huỷ lịch\n5️⃣ **Xác nhận**: Xác nhận huỷ lịch\n\n⚠️ **Lưu ý**: Huỷ lịch trước 24h để tránh phí phạt!",
    "tìm bác sĩ": "🔍 **HƯỚNG DẪN TÌM BÁC SĨ PHÙ HỢP**\n\n1️⃣ **Vào trang đặt lịch**: Truy cập /booking\n2️⃣ **Xem danh sách**: Tất cả bác sĩ đang hoạt động\n3️⃣ **Lọc theo chuyên khoa**: Chọn chuyên khoa bạn cần\n4️⃣ **Xem thông tin**: Click vào bác sĩ để xem chi tiết\n5️⃣ **Kiểm tra lịch**: Xem lịch rảnh của bác sĩ\n\n💡 **Gợi ý**: Chọn bác sĩ có nhiều đánh giá tốt và lịch phù hợp!",
    "chọn bác sĩ": "👨‍⚕️ **HƯỚNG DẪN CHỌN BÁC SĨ**\n\n1️⃣ **Xem thông tin**: Tên, chuyên khoa, kinh nghiệm\n2️⃣ **Kiểm tra đánh giá**: Xem feedback từ bệnh nhân khác\n3️⃣ **Xem lịch rảnh**: Chọn bác sĩ có thời gian phù hợp\n4️⃣ **Liên hệ**: Có thể chat hoặc gọi trước\n5️⃣ **Đặt lịch**: Chọn slot thời gian phù hợp\n\n🎯 **Tiêu chí chọn**: Chuyên khoa phù hợp + Lịch rảnh + Đánh giá tốt",
    "lịch rảnh": "📅 **HƯỚNG DẪN XEM LỊCH RẢNH**\n\n1️⃣ **Chọn bác sĩ**: Từ danh sách bác sĩ\n2️⃣ **Chọn ngày**: Xem lịch theo tuần/tháng\n3️⃣ **Xem slot rảnh**: Các khung giờ có sẵn\n4️⃣ **Chọn thời gian**: Slot phù hợp với bạn\n5️⃣ **Đặt lịch**: Click vào slot để đặt\n\n⏰ **Lưu ý**: Lịch được cập nhật real-time, đặt sớm để có slot tốt!",
    
    // Profile & Account
    "cập nhật thông tin": "📝 **HƯỚNG DẪN CẬP NHẬT THÔNG TIN**\n\n1️⃣ **Vào hồ sơ**: Truy cập trang Hồ sơ cá nhân\n2️⃣ **Chỉnh sửa**: Nhấn nút 'Chỉnh sửa'\n3️⃣ **Cập nhật**: Thay đổi thông tin cần thiết\n4️⃣ **Lưu**: Nhấn 'Lưu thay đổi'\n\n✅ **Thông tin có thể cập nhật**: Tên, email, số điện thoại, địa chỉ",
    "đổi mật khẩu": "🔐 **HƯỚNG DẪN ĐỔI MẬT KHẨU**\n\n1️⃣ **Vào Hồ sơ**: Truy cập trang cá nhân\n2️⃣ **Chọn 'Đổi mật khẩu'**: Trong menu cài đặt\n3️⃣ **Nhập mật khẩu cũ**: Xác nhận danh tính\n4️⃣ **Nhập mật khẩu mới**: Tối thiểu 8 ký tự\n5️⃣ **Xác nhận mật khẩu mới**: Nhập lại để kiểm tra\n6️⃣ **Lưu thay đổi**: Hoàn tất quá trình\n\n🔒 **Bảo mật**: Mật khẩu mới phải có chữ hoa, chữ thường, số và ký tự đặc biệt",
    "xem hồ sơ": "📋 **HƯỚNG DẪN XEM HỒ SƠ**\n\n1️⃣ **Vào trang Hồ sơ**: Truy cập /profile\n2️⃣ **Xem thông tin cá nhân**: Tên, email, số điện thoại\n3️⃣ **Xem lịch sử đặt lịch**: Tất cả lịch đã đặt\n4️⃣ **Xem thống kê**: Số lần đặt lịch, bác sĩ đã gặp\n5️⃣ **Cập nhật thông tin**: Chỉnh sửa nếu cần\n\n📊 **Thông tin hiển thị**: Thông tin cá nhân, lịch sử, thống kê",
    
    // History & Tracking
    "xem lịch sử": "📋 **HƯỚNG DẪN XEM LỊCH SỬ**\n\n1️⃣ **Vào Dashboard**: Truy cập trang chính\n2️⃣ **Chọn lịch sử**: Nhấn 'Lịch sử đặt lịch'\n3️⃣ **Xem danh sách**: Tất cả lịch đã đặt\n4️⃣ **Chi tiết**: Click vào từng lịch để xem chi tiết\n\n📊 **Thông tin hiển thị**: Ngày giờ, bác sĩ, trạng thái, ghi chú",
    "lịch sử đặt lịch": "📚 **LỊCH SỬ ĐẶT LỊCH**\n\n1️⃣ **Vào trang Hồ sơ**: Truy cập /profile\n2️⃣ **Chọn 'Lịch sử'**: Tab lịch sử đặt lịch\n3️⃣ **Xem danh sách**: Tất cả lịch đã đặt\n4️⃣ **Lọc theo thời gian**: Tuần/tháng/năm\n5️⃣ **Xem chi tiết**: Click vào từng lịch\n6️⃣ **Tải xuống**: Xuất báo cáo nếu cần\n\n📈 **Thống kê**: Tổng số lịch, bác sĩ đã gặp, chi phí",
    "trạng thái lịch": "📊 **TRẠNG THÁI LỊCH HẸN**\n\n🟢 **Đã chấp nhận**: Bác sĩ đã xác nhận lịch\n🟡 **Đang chờ**: Chờ bác sĩ xác nhận\n🔴 **Đã huỷ**: Lịch đã bị huỷ\n✅ **Hoàn thành**: Đã khám xong\n⏰ **Sắp tới**: Lịch trong tương lai\n\n💡 **Lưu ý**: Kiểm tra email/SMS để nhận thông báo cập nhật",
    
    // Payment & Packages
    "thanh toán": "💳 **HƯỚNG DẪN THANH TOÁN**\n\n1️⃣ **Chọn gói**: Chọn gói dịch vụ phù hợp\n2️⃣ **Phương thức**: Chọn cách thanh toán (Visa, Mastercard, Momo...)\n3️⃣ **Thông tin**: Điền thông tin thanh toán\n4️⃣ **Xác nhận**: Kiểm tra và xác nhận thanh toán\n\n🔒 **Bảo mật**: Thông tin thanh toán được mã hóa an toàn!",
    "gói dịch vụ": "📦 **GÓI DỊCH VỤ VISIONARY CREW**\n\n🥉 **Gói Cơ bản**:\n• 5 lịch hẹn/tháng\n• Hỗ trợ cơ bản\n• Giá: 200k/tháng\n\n🥈 **Gói Nâng cao**:\n• 15 lịch hẹn/tháng\n• Ưu tiên đặt lịch\n• Hỗ trợ 24/7\n• Giá: 500k/tháng\n\n🥇 **Gói Premium**:\n• Không giới hạn lịch hẹn\n• Ưu tiên cao nhất\n• Tư vấn chuyên sâu\n• Giá: 1M/tháng\n\n💡 **Lưu ý**: Có thể nâng cấp/downgrade bất cứ lúc nào!",
    "phương thức thanh toán": "💳 **PHƯƠNG THỨC THANH TOÁN**\n\n🏦 **Chuyển khoản ngân hàng**:\n• Vietcombank, BIDV, Techcombank\n• Thời gian: 5-10 phút\n\n💳 **Thẻ tín dụng/ghi nợ**:\n• Visa, Mastercard, JCB\n• Bảo mật SSL\n\n📱 **Ví điện tử**:\n• Momo, ZaloPay, VNPay\n• Thanh toán nhanh\n\n🏪 **Tiền mặt**:\n• Tại văn phòng\n• Chỉ áp dụng cho gói Premium\n\n🔒 **Bảo mật**: Tất cả giao dịch được mã hóa SSL",
    
    // Notifications & Communication
    "thông báo": "🔔 **HỆ THỐNG THÔNG BÁO**\n\n📧 **Email thông báo**:\n• Xác nhận đặt lịch\n• Nhắc lịch hẹn (24h trước)\n• Cập nhật trạng thái\n• Kết quả khám\n\n📱 **SMS thông báo**:\n• Nhắc lịch hẹn\n• Thay đổi lịch\n• Hủy lịch\n\n🔔 **Push notification**:\n• Thông báo real-time\n• Cập nhật trạng thái\n• Tin tức y tế\n\n⚙️ **Cài đặt**: Vào Hồ sơ > Cài đặt > Thông báo",
    "liên hệ": "📞 **THÔNG TIN LIÊN HỆ**\n\n📧 **Email hỗ trợ**: support@visionarycrew.com\n📱 **Hotline**: 1900-xxxx (8h-22h)\n💬 **Chat online**: Có sẵn 24/7\n🏢 **Văn phòng**: 123 Đường ABC, Quận 1, TP.HCM\n\n⏰ **Giờ làm việc**:\n• Thứ 2-6: 8h-18h\n• Thứ 7: 8h-12h\n• Chủ nhật: Nghỉ\n\n🚨 **Khẩn cấp**: Gọi 1900-xxxx (24/7)",
    
    // Technical Support
    "lỗi": "🔧 **HƯỚNG DẪN XỬ LÝ LỖI**\n\n❌ **Không đặt được lịch**:\n• Kiểm tra kết nối internet\n• Thử lại sau 5 phút\n• Liên hệ hỗ trợ nếu vẫn lỗi\n\n❌ **Không nhận được thông báo**:\n• Kiểm tra email spam\n• Cập nhật số điện thoại\n• Kiểm tra cài đặt thông báo\n\n❌ **Không đăng nhập được**:\n• Kiểm tra email/mật khẩu\n• Thử 'Quên mật khẩu'\n• Liên hệ hỗ trợ\n\n💡 **Lưu ý**: Chụp màn hình lỗi để hỗ trợ tốt hơn",
    "quên mật khẩu": "🔑 **HƯỚNG DẪN KHÔI PHỤC MẬT KHẨU**\n\n1️⃣ **Vào trang đăng nhập**: Truy cập /login\n2️⃣ **Click 'Quên mật khẩu'**: Dưới form đăng nhập\n3️⃣ **Nhập email**: Email đã đăng ký\n4️⃣ **Kiểm tra email**: Link reset sẽ được gửi\n5️⃣ **Click link**: Trong email để reset\n6️⃣ **Nhập mật khẩu mới**: Tối thiểu 8 ký tự\n7️⃣ **Xác nhận**: Hoàn tất quá trình\n\n⏰ **Thời gian**: Link có hiệu lực trong 24h",
    
    // General Help
    "giúp đỡ": "🤝 **TRUNG TÂM HỖ TRỢ**\n\n📚 **Hướng dẫn sử dụng**:\n• Cách đặt lịch hẹn\n• Quản lý hồ sơ\n• Thanh toán\n• Xử lý lỗi\n\n📞 **Liên hệ hỗ trợ**:\n• Hotline: 1900-xxxx\n• Email: support@visionarycrew.com\n• Chat online: 24/7\n\n🔍 **Tìm kiếm**:\n• Sử dụng thanh tìm kiếm\n• Xem FAQ\n• Video hướng dẫn\n\n💡 **Mẹo**: Chat với AI để được hỗ trợ nhanh nhất!",
    "faq": "❓ **CÂU HỎI THƯỜNG GẶP**\n\n🤔 **Làm sao đặt lịch hẹn?**\n→ Vào trang /booking, chọn bác sĩ và thời gian\n\n🤔 **Có thể huỷ lịch không?**\n→ Có, huỷ trước 24h để tránh phí\n\n🤔 **Thanh toán bằng cách nào?**\n→ Chuyển khoản, thẻ, ví điện tử\n\n🤔 **Làm sao liên hệ bác sĩ?**\n→ Chat trong app hoặc gọi hotline\n\n🤔 **Có bảo hiểm không?**\n→ Có, tùy theo gói dịch vụ\n\n💡 **Không tìm thấy câu trả lời?** Chat với AI hoặc liên hệ hỗ trợ!",
    
    // Smart Suggestions
    "bác sĩ tốt": "🏆 **GỢI Ý CHỌN BÁC SĨ TỐT**\n\n⭐ **Tiêu chí đánh giá**:\n• Kinh nghiệm > 5 năm\n• Đánh giá 4.5+ sao\n• Số lịch đã hoàn thành > 100\n• Chuyên khoa phù hợp\n\n🎯 **Bác sĩ nổi bật**:\n• Dr. Nguyễn Văn A - Tim mạch (4.8★)\n• Dr. Trần Thị B - Nhi khoa (4.9★)\n• Dr. Lê Văn C - Da liễu (4.7★)\n\n💡 **Lưu ý**: Đặt sớm vì bác sĩ tốt thường đông lịch!",
    "khám online": "💻 **HƯỚNG DẪN KHÁM ONLINE**\n\n1️⃣ **Chọn lịch online**: Khi đặt lịch\n2️⃣ **Kiểm tra thiết bị**: Camera, mic, internet\n3️⃣ **Chuẩn bị**: Tài liệu y tế, danh sách thuốc\n4️⃣ **Tham gia**: Click link 5 phút trước\n5️⃣ **Khám**: Tương tác với bác sĩ\n6️⃣ **Kết quả**: Nhận đơn thuốc qua email\n\n💡 **Ưu điểm**: Tiết kiệm thời gian, không cần di chuyển",
    "khám offline": "🏥 **HƯỚNG DẪN KHÁM OFFLINE**\n\n1️⃣ **Chọn lịch offline**: Khi đặt lịch\n2️⃣ **Địa chỉ**: 123 Đường ABC, Quận 1\n3️⃣ **Chuẩn bị**: CMND, bảo hiểm (nếu có)\n4️⃣ **Đến sớm**: 15 phút trước giờ hẹn\n5️⃣ **Làm thủ tục**: Đăng ký tại quầy\n6️⃣ **Khám**: Theo hướng dẫn nhân viên\n\n🗺️ **Chỉ đường**: Xem bản đồ trong app hoặc website",
    
    // Emergency & Urgent Care
    "khẩn cấp": "🚨 **CHĂM SÓC KHẨN CẤP**\n\n📞 **Liên hệ ngay**:\n• Hotline khẩn cấp: 1900-xxxx\n• Bệnh viện gần nhất\n• 115 (cấp cứu)\n\n⚠️ **Triệu chứng cần cấp cứu**:\n• Đau ngực, khó thở\n• Chảy máu nhiều\n• Ngất xỉu\n• Sốt cao > 39°C\n\n🏥 **Bệnh viện khẩn cấp**:\n• Bệnh viện Chợ Rẫy\n• Bệnh viện Nhân dân 115\n• Bệnh viện Đại học Y Dược\n\n💡 **Lưu ý**: Không tự điều trị, liên hệ ngay khi có triệu chứng nặng!",
    
    // Health Tips
    "sức khỏe": "💪 **LỜI KHUYÊN SỨC KHỎE**\n\n🥗 **Dinh dưỡng**:\n• Ăn nhiều rau xanh, trái cây\n• Uống đủ nước (2-3L/ngày)\n• Hạn chế đồ ăn nhanh\n\n🏃‍♂️ **Vận động**:\n• Tập thể dục 30 phút/ngày\n• Đi bộ 10,000 bước\n• Yoga, thiền giảm stress\n\n😴 **Giấc ngủ**:\n• Ngủ 7-8 tiếng/đêm\n• Đi ngủ trước 23h\n• Tắt điện thoại trước khi ngủ\n\n🧘‍♀️ **Tinh thần**:\n• Giảm stress, lo âu\n• Dành thời gian cho gia đình\n• Học kỹ năng mới\n\n💡 **Khám định kỳ**: 6 tháng/lần để phát hiện bệnh sớm!",
    
    // App Features
    "tính năng": "⚡ **TÍNH NĂNG VISIONARY CREW**\n\n📅 **Đặt lịch thông minh**:\n• Chọn bác sĩ theo chuyên khoa\n• Xem lịch rảnh real-time\n• Nhắc lịch tự động\n\n👨‍⚕️ **Tư vấn online**:\n• Chat với bác sĩ 24/7\n• Video call khám bệnh\n• Gửi ảnh, tài liệu\n\n📊 **Theo dõi sức khỏe**:\n• Lịch sử khám bệnh\n• Kết quả xét nghiệm\n• Đơn thuốc điện tử\n\n💳 **Thanh toán tiện lợi**:\n• Nhiều phương thức\n• Bảo mật cao\n• Hóa đơn điện tử\n\n🔔 **Thông báo thông minh**:\n• Nhắc lịch hẹn\n• Cập nhật trạng thái\n• Tin tức y tế\n\n💡 **AI Assistant**: Chat với tôi để được hỗ trợ nhanh nhất!",
    
    // Navigation & Routing
    "đến trang": "🧭 **ĐIỀU HƯỚNG TRANG**\n\n📱 **Trang chính**:\n• / - Trang chủ\n• /booking - Đặt lịch hẹn\n• /profile - Hồ sơ cá nhân\n\n👨‍⚕️ **Trang bác sĩ**:\n• /doctor/dashboard - Dashboard bác sĩ\n• /doctor/booking - Tạo lịch rảnh\n• /doctor/pending - Yêu cầu đăng ký\n• /doctor/profile - Hồ sơ bác sĩ\n• /doctor/packages - Gói dịch vụ\n\n👨‍💼 **Trang admin**:\n• /admin/dashboard - Dashboard admin\n• /admin/doctors - Quản lý bác sĩ\n• /admin/users - Quản lý người dùng\n• /admin/doctors/pending - Xét duyệt đăng ký\n\n💡 **Lưu ý**: Tôi có thể giúp bạn điều hướng đến bất kỳ trang nào!",
    "đi đến": "🚀 **ĐIỀU HƯỚNG NHANH**\n\n🎯 **Trang phổ biến**:\n• Trang chủ: / \n• Đặt lịch: /booking\n• Hồ sơ: /profile\n• Dashboard: /doctor/dashboard hoặc /admin/dashboard\n\n💡 **Cách sử dụng**:\n• Nói 'đưa tôi đến trang đặt lịch'\n• Nói 'đi đến hồ sơ'\n• Nói 'mở dashboard'\n\n🔄 **Tự động điều hướng**: Tôi sẽ đưa bạn đến trang mong muốn ngay lập tức!",
    "mở trang": "📂 **MỞ TRANG**\n\n🏠 **Trang chính**:\n• Trang chủ: / \n• Đặt lịch: /booking\n• Hồ sơ: /profile\n• Đăng nhập: /login\n• Đăng ký: /register/user\n\n👨‍⚕️ **Trang bác sĩ**:\n• Dashboard: /doctor/dashboard\n• Tạo lịch: /doctor/booking\n• Yêu cầu: /doctor/pending\n• Hồ sơ: /doctor/profile\n• Gói dịch vụ: /doctor/packages\n\n👨‍💼 **Trang admin**:\n• Dashboard: /admin/dashboard\n• Quản lý bác sĩ: /admin/doctors\n• Quản lý người dùng: /admin/users\n• Xét duyệt: /admin/doctors/pending\n\n💡 **Lưu ý**: Chỉ cần nói tên trang, tôi sẽ mở ngay!",
    "đưa tôi đến": "🎯 **ĐIỀU HƯỚNG TRỰC TIẾP**\n\n📱 **Trang người dùng**:\n• / - Trang chủ\n• /booking - Đặt lịch hẹn\n• /profile - Hồ sơ cá nhân\n• /login - Đăng nhập\n• /register/user - Đăng ký người dùng\n• /register/doctor - Đăng ký bác sĩ\n\n👨‍⚕️ **Trang bác sĩ**:\n• /doctor/dashboard - Dashboard\n• /doctor/booking - Tạo lịch\n• /doctor/pending - Yêu cầu đăng ký\n• /doctor/profile - Hồ sơ\n• /doctor/packages - Gói dịch vụ\n• /doctor/payment/history - Lịch sử thanh toán\n\n👨‍💼 **Trang admin**:\n• /admin/dashboard - Dashboard\n• /admin/doctors - Quản lý bác sĩ\n• /admin/users - Quản lý người dùng\n• /admin/doctors/pending - Xét duyệt\n\n💡 **Cách sử dụng**: 'Đưa tôi đến trang đặt lịch' → Tự động điều hướng!",
    "navigate": "🧭 **NAVIGATION COMMANDS**\n\n🎯 **Quick Navigation**:\n• 'đưa tôi đến trang chủ' → /\n• 'đưa tôi đến đặt lịch' → /booking\n• 'đưa tôi đến hồ sơ' → /profile\n• 'đưa tôi đến dashboard' → /doctor/dashboard hoặc /admin/dashboard\n\n👨‍⚕️ **Doctor Pages**:\n• 'đưa tôi đến tạo lịch' → /doctor/booking\n• 'đưa tôi đến yêu cầu đăng ký' → /doctor/pending\n• 'đưa tôi đến gói dịch vụ' → /doctor/packages\n\n👨‍💼 **Admin Pages**:\n• 'đưa tôi đến quản lý bác sĩ' → /admin/doctors\n• 'đưa tôi đến quản lý người dùng' → /admin/users\n• 'đưa tôi đến xét duyệt' → /admin/doctors/pending\n\n💡 **Auto Navigation**: Tôi sẽ tự động điều hướng khi bạn yêu cầu!"
  },
  doctor: {
    // Schedule Management
    "tạo lịch": "📅 **HƯỚNG DẪN TẠO LỊCH RẢNH**\n\n1️⃣ **Vào trang Tạo lịch**: Truy cập /doctor/booking\n2️⃣ **Chọn ngày**: Chọn ngày muốn tạo lịch\n3️⃣ **Chọn giờ rảnh**: Đánh dấu các slot thời gian\n4️⃣ **Điền thông tin**: Loại khám (online/offline), ghi chú\n5️⃣ **Lưu lịch**: Nhấn 'Lưu lịch rảnh'\n\n💡 **Lưu ý**: Tạo lịch trước ít nhất 24h để bệnh nhân có thể đặt!",
    "xem lịch đã đặt": "📋 **HƯỚNG DẪN XEM LỊCH ĐÃ ĐẶT**\n\n1️⃣ **Vào Dashboard**: Truy cập /doctor/dashboard\n2️⃣ **Chọn 'Lịch đã đặt'**: Tab lịch hẹn\n3️⃣ **Xem danh sách**: Tất cả bệnh nhân đã đặt\n4️⃣ **Chi tiết**: Click vào từng lịch để xem thông tin\n5️⃣ **Cập nhật trạng thái**: Chấp nhận/từ chối lịch hẹn\n\n📊 **Thông tin hiển thị**: Tên bệnh nhân, thời gian, triệu chứng, trạng thái",
    "quản lý lịch": "🗓️ **QUẢN LÝ LỊCH HẸN**\n\n📅 **Tạo lịch rảnh**:\n• Chọn ngày và giờ rảnh\n• Đặt loại khám (online/offline)\n• Thêm ghi chú nếu cần\n\n👥 **Xem lịch đã đặt**:\n• Danh sách bệnh nhân đã đặt\n• Thông tin chi tiết từng lịch\n• Cập nhật trạng thái\n\n📊 **Thống kê**:\n• Số lịch đã hoàn thành\n• Doanh thu theo tháng\n• Đánh giá từ bệnh nhân\n\n💡 **Mẹo**: Tạo lịch theo pattern để tiết kiệm thời gian!",
    "lịch rảnh": "⏰ **QUẢN LÝ LỊCH RẢNH**\n\n📅 **Tạo lịch**:\n• Chọn ngày cụ thể\n• Đánh dấu slot thời gian\n• Đặt loại khám (online/offline)\n• Thêm ghi chú\n\n🔄 **Cập nhật lịch**:\n• Thay đổi thời gian\n• Hủy slot không rảnh\n• Thêm slot mới\n\n📊 **Xem thống kê**:\n• Số slot đã tạo\n• Số slot đã đặt\n• Tỷ lệ đặt lịch\n\n💡 **Lưu ý**: Cập nhật lịch thường xuyên để bệnh nhân có thể đặt!",
    
    // Patient Management
    "bệnh nhân": "👥 **QUẢN LÝ BỆNH NHÂN**\n\n📋 **Xem danh sách**:\n• Tất cả bệnh nhân đã đặt lịch\n• Thông tin cá nhân\n• Lịch sử khám bệnh\n\n📊 **Thống kê bệnh nhân**:\n• Số bệnh nhân mới/tháng\n• Bệnh nhân quay lại\n• Đánh giá trung bình\n\n💬 **Liên hệ**:\n• Chat với bệnh nhân\n• Gửi thông báo\n• Nhắc lịch hẹn\n\n💡 **Mẹo**: Lưu ghi chú về bệnh nhân để theo dõi tốt hơn!",
    "xem bệnh nhân": "👤 **XEM THÔNG TIN BỆNH NHÂN**\n\n1️⃣ **Vào lịch đã đặt**: Truy cập /doctor/dashboard\n2️⃣ **Chọn lịch hẹn**: Click vào lịch cụ thể\n3️⃣ **Xem thông tin**: Tên, tuổi, số điện thoại\n4️⃣ **Lịch sử khám**: Các lần khám trước\n5️⃣ **Triệu chứng**: Ghi chú từ bệnh nhân\n6️⃣ **Cập nhật**: Thêm ghi chú sau khám\n\n📋 **Thông tin hiển thị**: Thông tin cá nhân, lịch sử, triệu chứng, kết quả",
    
    // Profile & Settings
    "cập nhật hồ sơ": "📝 **HƯỚNG DẪN CẬP NHẬT HỒ SƠ**\n\n1️⃣ **Vào trang Hồ sơ**: Truy cập /doctor/profile\n2️⃣ **Click 'Chỉnh sửa'**: Nút chỉnh sửa hồ sơ\n3️⃣ **Cập nhật thông tin**: Tên, chuyên khoa, kinh nghiệm\n4️⃣ **Upload ảnh**: Ảnh đại diện mới\n5️⃣ **Lưu thay đổi**: Nhấn 'Lưu hồ sơ'\n\n✅ **Thông tin có thể cập nhật**: Tên, chuyên khoa, kinh nghiệm, ảnh, mô tả",
    "hồ sơ bác sĩ": "👨‍⚕️ **HỒ SƠ BÁC SĨ**\n\n📋 **Thông tin cá nhân**:\n• Tên, tuổi, giới tính\n• Chuyên khoa chính\n• Kinh nghiệm làm việc\n• Bằng cấp, chứng chỉ\n\n📊 **Thống kê hoạt động**:\n• Số lịch đã hoàn thành\n• Đánh giá trung bình\n• Doanh thu theo tháng\n• Bệnh nhân mới/quay lại\n\n💬 **Mô tả**:\n• Giới thiệu bản thân\n• Chuyên môn\n• Phương pháp điều trị\n• Thời gian làm việc\n\n💡 **Lưu ý**: Hồ sơ chi tiết giúp bệnh nhân tin tưởng hơn!",
    
    // Registration & Approval
    "xem yêu cầu": "📋 **HƯỚNG DẪN XEM YÊU CẦU ĐĂNG KÝ**\n\n1️⃣ **Vào trang 'Yêu cầu đăng ký'**: Truy cập /doctor/pending\n2️⃣ **Xem danh sách**: Tất cả đơn đăng ký mới\n3️⃣ **Xem chi tiết**: Click vào từng đơn để xem thông tin\n4️⃣ **Xét duyệt**: Chấp nhận hoặc từ chối\n5️⃣ **Gửi thông báo**: Thông báo kết quả cho ứng viên\n\n📊 **Thông tin đơn**: Tên, chuyên khoa, kinh nghiệm, bằng cấp",
    "xét duyệt": "✅ **HƯỚNG DẪN XÉT DUYỆT ĐĂNG KÝ**\n\n📋 **Xem đơn đăng ký**:\n• Danh sách ứng viên mới\n• Thông tin chi tiết\n• Bằng cấp, kinh nghiệm\n\n✅ **Chấp nhận**:\n• Gửi email chào mừng\n• Hướng dẫn tạo tài khoản\n• Cấp quyền truy cập\n\n❌ **Từ chối**:\n• Gửi email thông báo\n• Giải thích lý do\n• Khuyến khích đăng ký lại\n\n⏰ **Thời gian**: Xét duyệt trong vòng 24-48h",
    
    // Payment & Packages
    "thanh toán gói": "💳 **HƯỚNG DẪN MUA GÓI DỊCH VỤ**\n\n1️⃣ **Vào trang Thanh toán**: Truy cập /doctor/packages\n2️⃣ **Chọn gói phù hợp**: Cơ bản/Nâng cao/Premium\n3️⃣ **Xem chi tiết**: Tính năng, giá cả, thời hạn\n4️⃣ **Thanh toán online**: Chọn phương thức thanh toán\n5️⃣ **Kích hoạt gói**: Tự động sau khi thanh toán thành công\n\n💡 **Lưu ý**: Gói Premium có nhiều tính năng ưu đãi!",
    "gói dịch vụ": "📦 **GÓI DỊCH VỤ CHO BÁC SĨ**\n\n🥉 **Gói Cơ bản**:\n• Tạo 20 lịch/tháng\n• Hỗ trợ cơ bản\n• Giá: 300k/tháng\n\n🥈 **Gói Nâng cao**:\n• Tạo 50 lịch/tháng\n• Thống kê chi tiết\n• Hỗ trợ 24/7\n• Giá: 700k/tháng\n\n🥇 **Gói Premium**:\n• Không giới hạn lịch\n• Marketing hỗ trợ\n• Tư vấn chuyên sâu\n• Giá: 1.5M/tháng\n\n💡 **Lưu ý**: Nâng cấp để có thêm tính năng và bệnh nhân!",
    
    // Communication
    "chat bệnh nhân": "💬 **CHAT VỚI BỆNH NHÂN**\n\n📱 **Tính năng chat**:\n• Chat real-time với bệnh nhân\n• Gửi ảnh, tài liệu\n• Nhắc lịch hẹn\n• Tư vấn trước khám\n\n📋 **Quản lý tin nhắn**:\n• Xem lịch sử chat\n• Tìm kiếm tin nhắn\n• Lưu tin nhắn quan trọng\n• Gửi tin nhắn hàng loạt\n\n⏰ **Thời gian phản hồi**:\n• Trả lời trong vòng 2h\n• Chat 24/7 cho Premium\n• Tự động trả lời ngoài giờ\n\n💡 **Mẹo**: Sử dụng template tin nhắn để tiết kiệm thời gian!",
    
    // Statistics & Reports
    "thống kê": "📊 **THỐNG KÊ HOẠT ĐỘNG**\n\n📈 **Thống kê lịch hẹn**:\n• Số lịch đã hoàn thành\n• Số lịch đã hủy\n• Tỷ lệ đặt lịch\n• Thời gian trung bình\n\n💰 **Thống kê doanh thu**:\n• Doanh thu theo tháng\n• Thu nhập trung bình\n• Gói dịch vụ bán chạy\n• Xu hướng tăng trưởng\n\n👥 **Thống kê bệnh nhân**:\n• Bệnh nhân mới\n• Bệnh nhân quay lại\n• Đánh giá trung bình\n• Phản hồi tích cực\n\n💡 **Lưu ý**: Xem thống kê để cải thiện dịch vụ!",
    
    // Technical Support
    "hỗ trợ": "🤝 **HỖ TRỢ BÁC SĨ**\n\n📞 **Liên hệ hỗ trợ**:\n• Hotline: 1900-xxxx\n• Email: doctor@visionarycrew.com\n• Chat online: 24/7\n\n🔧 **Hỗ trợ kỹ thuật**:\n• Cài đặt tài khoản\n• Sử dụng tính năng\n• Xử lý lỗi\n• Nâng cấp gói\n\n📚 **Tài liệu hướng dẫn**:\n• Video tutorial\n• Hướng dẫn sử dụng\n• FAQ\n• Best practices\n\n💡 **Mẹo**: Chat với AI để được hỗ trợ nhanh nhất!"
  },
  admin: {
    // Doctor Management
    "quản lý bác sĩ": "👨‍⚕️ **QUẢN LÝ BÁC SĨ**\n\n📋 **Xem danh sách**:\n• Tất cả bác sĩ đang hoạt động\n• Thông tin chi tiết từng bác sĩ\n• Trạng thái tài khoản\n• Số lịch đã hoàn thành\n\n📊 **Thống kê bác sĩ**:\n• Tổng số bác sĩ\n• Bác sĩ mới/tháng\n• Chuyên khoa phổ biến\n• Đánh giá trung bình\n\n⚙️ **Quản lý**:\n• Kích hoạt/vô hiệu hóa tài khoản\n• Cập nhật thông tin\n• Xem lịch sử hoạt động\n• Xử lý khiếu nại\n\n💡 **Lưu ý**: Kiểm tra thông tin bác sĩ trước khi phê duyệt!",
    "bác sĩ": "👨‍⚕️ **DANH SÁCH BÁC SĨ**\n\n1️⃣ **Vào trang 'Bác sĩ'**: Truy cập /admin/doctors\n2️⃣ **Xem danh sách**: Tất cả bác sĩ đã đăng ký\n3️⃣ **Lọc theo**: Chuyên khoa, trạng thái, đánh giá\n4️⃣ **Xem chi tiết**: Click vào từng bác sĩ\n5️⃣ **Quản lý**: Kích hoạt/vô hiệu hóa, cập nhật\n\n📊 **Thông tin hiển thị**: Tên, chuyên khoa, trạng thái, đánh giá, số lịch",
    "xem bác sĩ": "👤 **XEM THÔNG TIN BÁC SĨ**\n\n1️⃣ **Chọn bác sĩ**: Từ danh sách bác sĩ\n2️⃣ **Xem thông tin cá nhân**: Tên, tuổi, chuyên khoa\n3️⃣ **Xem bằng cấp**: Chứng chỉ, kinh nghiệm\n4️⃣ **Xem thống kê**: Số lịch, đánh giá, doanh thu\n5️⃣ **Xem lịch sử**: Hoạt động gần đây\n6️⃣ **Quản lý**: Cập nhật trạng thái tài khoản\n\n📋 **Thông tin chi tiết**: Hồ sơ, bằng cấp, thống kê, lịch sử",
    
    // User Management
    "quản lý người dùng": "👥 **QUẢN LÝ NGƯỜI DÙNG**\n\n📋 **Xem danh sách**:\n• Tất cả người dùng đã đăng ký\n• Thông tin cá nhân\n• Trạng thái tài khoản\n• Số lịch đã đặt\n\n📊 **Thống kê người dùng**:\n• Tổng số người dùng\n• Người dùng mới/tháng\n• Tỷ lệ hoạt động\n• Gói dịch vụ phổ biến\n\n⚙️ **Quản lý**:\n• Kích hoạt/vô hiệu hóa tài khoản\n• Cập nhật thông tin\n• Xem lịch sử đặt lịch\n• Xử lý khiếu nại\n\n💡 **Lưu ý**: Bảo vệ thông tin cá nhân người dùng!",
    "người dùng": "👥 **DANH SÁCH NGƯỜI DÙNG**\n\n1️⃣ **Vào trang 'Người dùng'**: Truy cập /admin/users\n2️⃣ **Xem danh sách**: Tất cả người dùng đã đăng ký\n3️⃣ **Lọc theo**: Trạng thái, gói dịch vụ, thời gian\n4️⃣ **Xem chi tiết**: Click vào từng người dùng\n5️⃣ **Quản lý**: Kích hoạt/vô hiệu hóa, cập nhật\n\n📊 **Thông tin hiển thị**: Tên, email, trạng thái, gói dịch vụ, số lịch",
    "xem người dùng": "👤 **XEM THÔNG TIN NGƯỜI DÙNG**\n\n1️⃣ **Chọn người dùng**: Từ danh sách người dùng\n2️⃣ **Xem thông tin cá nhân**: Tên, email, số điện thoại\n3️⃣ **Xem lịch sử đặt lịch**: Tất cả lịch đã đặt\n4️⃣ **Xem gói dịch vụ**: Loại gói, thời hạn\n5️⃣ **Xem thống kê**: Số lịch, bác sĩ đã gặp\n6️⃣ **Quản lý**: Cập nhật trạng thái tài khoản\n\n📋 **Thông tin chi tiết**: Hồ sơ, lịch sử, gói dịch vụ, thống kê",
    
    // Registration Approval
    "xét duyệt đăng ký": "✅ **XÉT DUYỆT ĐĂNG KÝ BÁC SĨ**\n\n📋 **Xem đơn đăng ký**:\n• Danh sách ứng viên mới\n• Thông tin chi tiết\n• Bằng cấp, kinh nghiệm\n• Chuyên khoa\n\n✅ **Chấp nhận**:\n• Gửi email chào mừng\n• Hướng dẫn tạo tài khoản\n• Cấp quyền truy cập\n• Thêm vào danh sách bác sĩ\n\n❌ **Từ chối**:\n• Gửi email thông báo\n• Giải thích lý do\n• Khuyến khích đăng ký lại\n• Lưu lý do từ chối\n\n⏰ **Thời gian**: Xét duyệt trong vòng 24-48h",
    "đơn đăng ký": "📋 **ĐƠN ĐĂNG KÝ BÁC SĨ**\n\n1️⃣ **Vào trang 'Đơn đăng ký'**: Truy cập /admin/doctors/pending\n2️⃣ **Xem danh sách**: Tất cả đơn đăng ký mới\n3️⃣ **Xem chi tiết**: Click vào từng đơn\n4️⃣ **Kiểm tra thông tin**: Bằng cấp, kinh nghiệm\n5️⃣ **Xét duyệt**: Chấp nhận hoặc từ chối\n6️⃣ **Gửi thông báo**: Email kết quả\n\n📊 **Thông tin đơn**: Tên, chuyên khoa, kinh nghiệm, bằng cấp, lý do đăng ký",
    "phê duyệt": "✅ **HƯỚNG DẪN PHÊ DUYỆT**\n\n📋 **Kiểm tra thông tin**:\n• Xác minh bằng cấp\n• Kiểm tra kinh nghiệm\n• Đánh giá chuyên môn\n• Tham khảo ý kiến chuyên gia\n\n✅ **Quy trình chấp nhận**:\n• Gửi email chào mừng\n• Hướng dẫn tạo tài khoản\n• Cấp quyền truy cập hệ thống\n• Thêm vào danh sách bác sĩ\n• Gửi tài liệu hướng dẫn\n\n❌ **Quy trình từ chối**:\n• Gửi email thông báo\n• Giải thích lý do cụ thể\n• Khuyến khích đăng ký lại\n• Lưu lý do để tham khảo\n\n⏰ **Thời gian**: Xử lý trong vòng 24-48h",
    
    // System Statistics
    "thống kê hệ thống": "📊 **THỐNG KÊ HỆ THỐNG**\n\n📈 **Thống kê tổng quan**:\n• Tổng số người dùng\n• Tổng số bác sĩ\n• Tổng số lịch hẹn\n• Doanh thu tổng\n\n👥 **Thống kê người dùng**:\n• Người dùng mới/tháng\n• Tỷ lệ hoạt động\n• Gói dịch vụ phổ biến\n• Xu hướng tăng trưởng\n\n👨‍⚕️ **Thống kê bác sĩ**:\n• Bác sĩ mới/tháng\n• Chuyên khoa phổ biến\n• Đánh giá trung bình\n• Hiệu suất hoạt động\n\n💰 **Thống kê tài chính**:\n• Doanh thu theo tháng\n• Gói dịch vụ bán chạy\n• Chi phí vận hành\n• Lợi nhuận\n\n💡 **Lưu ý**: Xem thống kê để đưa ra quyết định kinh doanh!",
    "báo cáo": "📋 **BÁO CÁO HỆ THỐNG**\n\n📊 **Báo cáo hàng tháng**:\n• Thống kê người dùng mới\n• Thống kê bác sĩ mới\n• Doanh thu tháng\n• Lịch hẹn hoàn thành\n\n📈 **Báo cáo xu hướng**:\n• Tăng trưởng người dùng\n• Phổ biến chuyên khoa\n• Hiệu suất bác sĩ\n• Phản hồi khách hàng\n\n📉 **Báo cáo phân tích**:\n• Phân tích hành vi người dùng\n• Đánh giá chất lượng dịch vụ\n• Dự đoán xu hướng\n• Đề xuất cải thiện\n\n💡 **Lưu ý**: Xuất báo cáo để chia sẻ với team!",
    
    // System Management
    "quản lý hệ thống": "⚙️ **QUẢN LÝ HỆ THỐNG**\n\n🔧 **Cài đặt hệ thống**:\n• Cấu hình thông báo\n• Cài đặt thanh toán\n• Quản lý gói dịch vụ\n• Cấu hình bảo mật\n\n👥 **Quản lý quyền**:\n• Phân quyền admin\n• Quản lý role\n• Cấp quyền truy cập\n• Kiểm soát bảo mật\n\n📊 **Quản lý dữ liệu**:\n• Backup dữ liệu\n• Khôi phục dữ liệu\n• Xóa dữ liệu cũ\n• Tối ưu hiệu suất\n\n🔔 **Quản lý thông báo**:\n• Gửi thông báo hệ thống\n• Cập nhật thông báo\n• Quản lý template\n• Theo dõi trạng thái\n\n💡 **Lưu ý**: Backup dữ liệu thường xuyên!",
    "cài đặt": "⚙️ **CÀI ĐẶT HỆ THỐNG**\n\n🔧 **Cài đặt chung**:\n• Thông tin công ty\n• Logo, favicon\n• Thông tin liên hệ\n• Chính sách bảo mật\n\n💳 **Cài đặt thanh toán**:\n• Cấu hình cổng thanh toán\n• Phí giao dịch\n• Hóa đơn tự động\n• Báo cáo tài chính\n\n🔔 **Cài đặt thông báo**:\n• Email template\n• SMS template\n• Push notification\n• Thời gian gửi\n\n🔒 **Cài đặt bảo mật**:\n• Mật khẩu mạnh\n• Xác thực 2 yếu tố\n• Giới hạn đăng nhập\n• Mã hóa dữ liệu\n\n💡 **Lưu ý**: Test cài đặt trước khi áp dụng!",
    
    // Support & Help
    "hỗ trợ": "🤝 **HỖ TRỢ ADMIN**\n\n📞 **Liên hệ hỗ trợ**:\n• Hotline: 1900-xxxx\n• Email: admin@visionarycrew.com\n• Chat online: 24/7\n\n🔧 **Hỗ trợ kỹ thuật**:\n• Cài đặt hệ thống\n• Quản lý dữ liệu\n• Xử lý lỗi\n• Nâng cấp hệ thống\n\n📚 **Tài liệu hướng dẫn**:\n• Admin manual\n• Video tutorial\n• Best practices\n• Troubleshooting\n\n💡 **Mẹo**: Chat với AI để được hỗ trợ nhanh nhất!",
    
    // Security & Monitoring
    "bảo mật": "🔒 **BẢO MẬT HỆ THỐNG**\n\n🛡️ **Bảo mật dữ liệu**:\n• Mã hóa thông tin cá nhân\n• Backup dữ liệu tự động\n• Kiểm soát truy cập\n• Audit log\n\n🔐 **Xác thực người dùng**:\n• Mật khẩu mạnh\n• Xác thực 2 yếu tố\n• Giới hạn đăng nhập\n• Session timeout\n\n🚨 **Giám sát hệ thống**:\n• Theo dõi hoạt động\n• Phát hiện bất thường\n• Cảnh báo bảo mật\n• Báo cáo vi phạm\n\n💡 **Lưu ý**: Cập nhật bảo mật thường xuyên!",
    "giám sát": "👁️ **GIÁM SÁT HỆ THỐNG**\n\n📊 **Giám sát hiệu suất**:\n• Tốc độ tải trang\n• Thời gian phản hồi\n• Sử dụng tài nguyên\n• Lỗi hệ thống\n\n👥 **Giám sát người dùng**:\n• Hoạt động đăng nhập\n• Hành vi bất thường\n• Báo cáo vi phạm\n• Thống kê sử dụng\n\n🔔 **Cảnh báo tự động**:\n• Lỗi hệ thống\n• Bảo mật\n• Hiệu suất\n• Dung lượng\n\n💡 **Lưu ý**: Thiết lập cảnh báo để phát hiện sớm vấn đề!"
  }
};

// Default responses
const DEFAULT_RESPONSES = {
  user: "👋 **Xin chào! Tôi là trợ lý AI của VISIONARY CREW**\n\n🎯 **Tôi có thể giúp bạn:**\n• Đặt lịch hẹn với bác sĩ\n• Tìm bác sĩ phù hợp\n• Xem lịch sử đặt lịch\n• Cập nhật thông tin cá nhân\n• Thanh toán dịch vụ\n• Khám online/offline\n• Tư vấn sức khỏe\n\n💬 **Hãy hỏi tôi bất cứ điều gì!**",
  doctor: "👨‍⚕️ **Xin chào bác sĩ! Tôi là trợ lý AI**\n\n🎯 **Tôi có thể giúp bạn:**\n• Tạo lịch rảnh cho bệnh nhân\n• Quản lý lịch hẹn\n• Xem thông tin bệnh nhân\n• Cập nhật hồ sơ bác sĩ\n• Xem yêu cầu đăng ký\n• Thống kê hoạt động\n• Chat với bệnh nhân\n\n💬 **Hãy hỏi tôi bất cứ điều gì!**",
  admin: "👨‍💼 **Xin chào Admin! Tôi là trợ lý AI**\n\n🎯 **Tôi có thể giúp bạn:**\n• Quản lý danh sách bác sĩ\n• Quản lý người dùng\n• Xét duyệt đăng ký bác sĩ\n• Xem thống kê hệ thống\n• Quản lý hệ thống\n• Bảo mật và giám sát\n• Tạo báo cáo\n\n💬 **Hãy hỏi tôi bất cứ điều gì!**"
};

class MockAIService {
  constructor() {
    this.databaseStats = null;
    this.lastStatsUpdate = null;
  }

  // Update database stats from real API
  async updateDatabaseStats() {
    try {
      // Import models directly to get real data
      const User = (await import('../models/User/user.models.js')).default;
      const Doctor = (await import('../models/User/doctor.models.js')).default;
      const Schedule = (await import('../models/Schedule/schedule.models.js')).default;

      // Get real counts
      const totalUsers = await User.countDocuments();
      const totalDoctors = await Doctor.countDocuments();
      const totalSchedules = await Schedule.countDocuments();
      
      // Get real doctor data
      const doctors = await Doctor.find({}, 'doctorType fullName email phone doctorApplicationStatus');
              const specialties = [...new Set(doctors.map(doc => doc.doctorType).filter(spec => spec))];
      
      // Get active doctors (accepted)
      const activeDoctors = doctors.filter(doc => doc.doctorApplicationStatus === 'accepted');
      
      // Group doctors by specialty
      const doctorsBySpecialty = {};
      activeDoctors.forEach(doctor => {
        if (!doctorsBySpecialty[doctor.doctorType]) {
          doctorsBySpecialty[doctor.doctorType] = [];
        }
        doctorsBySpecialty[doctor.doctorType].push({
          name: doctor.fullName,
          email: doctor.email,
          phone: doctor.phone
        });
      });

      this.databaseStats = {
        totalUsers,
        totalDoctors,
        totalSchedules,
        specialties,
        activeDoctorsCount: activeDoctors.length,
        doctorsBySpecialty
      };
      
      this.lastStatsUpdate = new Date();
    } catch (error) {
      console.error('Error updating database stats:', error);
      // Fallback to minimal mock data
      this.databaseStats = {
        totalUsers: 1,
        totalDoctors: 1,
        totalSchedules: 5,
        specialties: ['Tim mạch'],
        activeDoctorsCount: 1,
        doctorsBySpecialty: {
          'Tim mạch': [
            { name: 'BS. Test Doctor', email: 'test@example.com', phone: '0901234567' }
          ]
        }
      };
    }
  }

  // Get doctor recommendations based on specialty
  getDoctorRecommendations(specialty) {
    if (!this.databaseStats) return [];
    
    const doctors = this.databaseStats.doctorsBySpecialty[specialty] || [];
    return doctors.map(doctor => ({
      name: doctor.name,
      contact: `${doctor.email} | ${doctor.phone}`
    }));
  }

  // Get doctors from API with flexible search
  async getDoctorsFromAPI(specialtyKeyword) {
    try {
      // Call the getAllDoctors API
      const response = await fetch('http://localhost:8080/api/doctors', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const doctors = data.doctors || [];
        
        // Filter doctors by specialty keyword
        const filteredDoctors = doctors.filter(doctor => {
          const doctorType = doctor.doctorType?.toLowerCase() || '';
          const keyword = specialtyKeyword.toLowerCase();
          return doctorType.includes(keyword);
        });

        return filteredDoctors.map(doctor => ({
          name: doctor.fullName,
          contact: `${doctor.email} | ${doctor.phone}`,
          specialty: doctor.doctorType
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching doctors from API:', error);
      return [];
    }
  }

  // Enhanced response with database knowledge
  async generateMockResponse(userRole, message, currentPage = '/') {
    // Update stats if needed (every 5 minutes)
    if (!this.lastStatsUpdate || (new Date() - this.lastStatsUpdate) > 5 * 60 * 1000) {
      await this.updateDatabaseStats();
    }

    const lowerMessage = message.toLowerCase();
    
    // Doctor recommendation patterns - only if user asks for specific specialty
    if (lowerMessage.includes('bác sĩ') && (
      lowerMessage.includes('tim') || lowerMessage.includes('thần kinh') || 
      lowerMessage.includes('da') || lowerMessage.includes('nhi') || 
      lowerMessage.includes('mắt') || lowerMessage.includes('tai') || 
      lowerMessage.includes('tiêu hóa') || lowerMessage.includes('dạ dày')
    )) {
      // Extract specialty from message
      let specialty = null;
      if (lowerMessage.includes('tim') || lowerMessage.includes('tim mạch')) specialty = 'Bác sĩ Tim mạch';
      else if (lowerMessage.includes('thần kinh') || lowerMessage.includes('não')) specialty = 'Bác sĩ Thần kinh';
      else if (lowerMessage.includes('da') || lowerMessage.includes('da liễu')) specialty = 'Bác sĩ Da liễu';
      else if (lowerMessage.includes('nhi') || lowerMessage.includes('trẻ em')) specialty = 'Bác sĩ Nhi khoa';
      else if (lowerMessage.includes('mắt') || lowerMessage.includes('mắt')) specialty = 'Bác sĩ Mắt';
      else if (lowerMessage.includes('tai') || lowerMessage.includes('mũi') || lowerMessage.includes('họng')) specialty = 'Bác sĩ Tai mũi họng';
      else if (lowerMessage.includes('tiêu hóa') || lowerMessage.includes('dạ dày')) specialty = 'Bác sĩ Tiêu hóa';

      if (specialty) {
        // Try to get doctors from API first
        const doctorsFromAPI = await this.getDoctorsFromAPI(specialty.replace('Bác sĩ ', ''));
        
        if (doctorsFromAPI.length > 0) {
          return {
            response: `🎯 **Tìm thấy ${doctorsFromAPI.length} bác sĩ chuyên khoa ${specialty.replace('Bác sĩ ', '')}:**\n\n${doctorsFromAPI.map((doc, index) => 
              `${index + 1}. **${doc.name}**\n   📞 Liên hệ: ${doc.contact}\n   🏥 Chuyên khoa: ${doc.specialty}`
            ).join('\n\n')}\n\n💡 **Để đặt lịch:** Vào trang Booking → Chọn bác sĩ → Chọn thời gian phù hợp\n\n🚀 **Tôi sẽ chuyển bạn đến trang Booking để đặt lịch ngay!**`,
            navigation: '/booking',
            suggestNavigation: null
          };
                  } else {
            // Fallback to database stats
            const doctors = this.getDoctorRecommendations(specialty);
            if (doctors.length > 0) {
              return {
                response: `🎯 **Tìm thấy ${doctors.length} bác sĩ chuyên khoa ${specialty.replace('Bác sĩ ', '')}:**\n\n${doctors.map((doc, index) => 
                  `${index + 1}. **${doc.name}**\n   📞 Liên hệ: ${doc.contact}`
                ).join('\n\n')}\n\n💡 **Để đặt lịch:** Vào trang Booking → Chọn bác sĩ → Chọn thời gian phù hợp\n\n🚀 **Tôi sẽ chuyển bạn đến trang Booking để đặt lịch ngay!**`,
                navigation: '/booking',
                suggestNavigation: null
              };
          } else {
            return {
              response: `❌ **Hiện tại chưa có bác sĩ chuyên khoa ${specialty.replace('Bác sĩ ', '')}**\n\n📋 **Các chuyên khoa có sẵn:**\n${this.databaseStats.specialties.map(spec => `• ${spec}`).join('\n')}\n\n💡 Hãy thử tìm bác sĩ chuyên khoa khác hoặc liên hệ admin để được hỗ trợ.`,
              navigation: null
            };
          }
        }
      }
    }

    // General doctor info - when user asks about doctors in general
    if (lowerMessage.includes('bác sĩ') || lowerMessage.includes('doctor') || lowerMessage.includes('khám')) {
      const specialties = this.databaseStats.specialties || [];
      const specialtiesList = specialties.length > 0 
        ? specialties.map(spec => `• ${spec}`).join('\n')
        : '• Chưa có chuyên khoa nào';

      return {
        response: `👨‍⚕️ **Thông tin bác sĩ trong hệ thống:**\n\n📊 **Thống kê:**\n• Tổng số bác sĩ: ${this.databaseStats.totalDoctors || 0}\n\n🏥 **Chuyên khoa có sẵn:**\n${specialtiesList}\n\n💡 **Để tìm bác sĩ cụ thể:** Hãy cho tôi biết bạn cần khám chuyên khoa gì (VD: "Tìm bác sĩ tim mạch")`,
        navigation: null
      };
    }

    // Database stats query
    if (lowerMessage.includes('thống kê') || lowerMessage.includes('database') || lowerMessage.includes('bao nhiêu')) {
      const specialties = this.databaseStats.specialties || [];
      const specialtiesList = specialties.length > 0 
        ? specialties.map(spec => `• ${spec}`).join('\n')
        : '• Chưa có chuyên khoa nào';

      return {
        response: `📊 **Thống kê hệ thống VISIONARY CREW:**\n\n👥 **Người dùng:** ${this.databaseStats.totalUsers || 0} người\n👨‍⚕️ **Bác sĩ:** ${this.databaseStats.totalDoctors || 0} bác sĩ\n📅 **Lịch hẹn:** ${this.databaseStats.totalSchedules || 0} lịch\n\n🏥 **Chuyên khoa:** ${specialties.length} chuyên khoa\n${specialtiesList}`,
        navigation: null
      };
    }

    // Check for navigation requests first
    const navigationPath = this.getNavigationPath(message);
    if (navigationPath) {
      
      // Get the detailed response for the navigation request
      let detailedResponse = '';
      if (navigationPath === '/booking') {
        detailedResponse = `📅 **HƯỚNG DẪN ĐẶT LỊCH HẸN**\n\n🎯 **Bước 1**: Chọn bác sĩ\n• Xem danh sách bác sĩ theo chuyên khoa\n• Đọc thông tin và đánh giá\n• Chọn bác sĩ phù hợp\n\n🎯 **Bước 2**: Chọn thời gian\n• Xem lịch rảnh của bác sĩ\n• Chọn ngày và giờ phù hợp\n• Kiểm tra loại khám (online/offline)\n\n🎯 **Bước 3**: Điền thông tin\n• Nhập triệu chứng bệnh\n• Thêm ghi chú nếu cần\n• Xác nhận thông tin cá nhân\n\n🎯 **Bước 4**: Thanh toán\n• Chọn phương thức thanh toán\n• Xác nhận đặt lịch\n• Nhận email xác nhận\n\n💡 **Lưu ý**:\n• Có thể huỷ lịch trước 24h\n• Khám online cần có camera/mic\n• Mang theo giấy tờ khi khám offline\n\n🚀 **Tôi sẽ đưa bạn đến trang đặt lịch ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/profile') {
        detailedResponse = `👤 **HƯỚNG DẪN QUẢN LÝ HỒ SƠ**\n\n📝 **Thông tin cá nhân**:\n• Cập nhật họ tên, email, số điện thoại\n• Thay đổi mật khẩu\n• Upload ảnh đại diện\n\n📋 **Lịch sử khám bệnh**:\n• Xem tất cả lịch hẹn đã đặt\n• Tải xuống kết quả xét nghiệm\n• Xem đơn thuốc điện tử\n\n💳 **Thanh toán**:\n• Xem lịch sử giao dịch\n• Quản lý phương thức thanh toán\n• Tải hóa đơn\n\n🔔 **Cài đặt**:\n• Bật/tắt thông báo\n• Chọn ngôn ngữ\n• Đổi theme giao diện\n\n🚀 **Tôi sẽ đưa bạn đến trang hồ sơ ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/doctor/dashboard') {
        detailedResponse = `👨‍⚕️ **HƯỚNG DẪN DASHBOARD BÁC SĨ**\n\n📊 **Thống kê tổng quan**:\n• Số lịch hẹn hôm nay\n• Doanh thu tháng này\n• Đánh giá từ bệnh nhân\n• Tỷ lệ hoàn thành lịch hẹn\n\n📅 **Quản lý lịch hẹn**:\n• Xem lịch hẹn sắp tới\n• Chấp nhận/từ chối yêu cầu\n• Tạo lịch rảnh mới\n• Cập nhật trạng thái lịch hẹn\n\n💬 **Tương tác**:\n• Chat với bệnh nhân\n• Gửi nhắc lịch\n• Cập nhật kết quả khám\n\n💰 **Tài chính**:\n• Xem doanh thu\n• Quản lý gói dịch vụ\n• Lịch sử thanh toán\n\n🚀 **Tôi sẽ đưa bạn đến dashboard ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/admin/doctors') {
        detailedResponse = `👨‍💼 **HƯỚNG DẪN QUẢN LÝ BÁC SĨ**\n\n👥 **Danh sách bác sĩ**:\n• Xem tất cả bác sĩ đã đăng ký\n• Tìm kiếm theo tên, chuyên khoa\n• Lọc theo trạng thái (active/inactive)\n\n✅ **Xét duyệt đăng ký**:\n• Xem hồ sơ bác sĩ mới\n• Kiểm tra bằng cấp, chứng chỉ\n• Chấp nhận/từ chối đăng ký\n• Gửi email thông báo\n\n📊 **Thống kê**:\n• Số lượng bác sĩ theo chuyên khoa\n• Hiệu suất hoạt động\n• Đánh giá từ bệnh nhân\n• Doanh thu theo bác sĩ\n\n🔧 **Quản lý**:\n• Khóa/mở khóa tài khoản\n• Cập nhật thông tin\n• Xem lịch sử hoạt động\n• Gửi thông báo\n\n🚀 **Tôi sẽ đưa bạn đến trang quản lý bác sĩ ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/doctor/booking') {
        detailedResponse = `📅 **HƯỚNG DẪN TẠO LỊCH RẢNH**\n\n🎯 **Bước 1**: Chọn ngày\n• Xem lịch làm việc\n• Chọn ngày muốn tạo lịch\n• Kiểm tra ngày nghỉ\n\n🎯 **Bước 2**: Tạo khung giờ\n• Chọn giờ bắt đầu và kết thúc\n• Đặt thời gian mỗi lịch hẹn (15-60 phút)\n• Chọn loại khám (online/offline)\n\n🎯 **Bước 3**: Cài đặt\n• Thêm ghi chú cho từng khung giờ\n• Đặt link meeting cho khám online\n• Cài đặt giá dịch vụ\n\n🎯 **Bước 4**: Xác nhận\n• Kiểm tra lại thông tin\n• Lưu lịch rảnh\n• Nhận thông báo khi có người đặt\n\n💡 **Lưu ý**:\n• Có thể chỉnh sửa lịch trước 2h\n• Tự động ẩn lịch đã đặt\n• Nhận thông báo real-time\n\n🚀 **Tôi sẽ đưa bạn đến trang tạo lịch ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/doctor/pending') {
        detailedResponse = `⏳ **HƯỚNG DẪN XỬ LÝ YÊU CẦU ĐĂNG KÝ**\n\n📋 **Danh sách yêu cầu**:\n• Xem tất cả yêu cầu đặt lịch mới\n• Lọc theo ngày, giờ, loại khám\n• Sắp xếp theo thời gian\n\n✅ **Chấp nhận lịch hẹn**:\n• Xem thông tin bệnh nhân\n• Kiểm tra triệu chứng bệnh\n• Gửi email xác nhận\n• Cập nhật trạng thái 'accepted'\n\n❌ **Từ chối lịch hẹn**:\n• Nhập lý do từ chối\n• Gửi email thông báo\n• Cập nhật trạng thái 'rejected'\n\n💬 **Tương tác**:\n• Chat với bệnh nhân\n• Gửi nhắc lịch\n• Cập nhật thông tin khám\n\n📊 **Thống kê**:\n• Số yêu cầu đang chờ\n• Tỷ lệ chấp nhận/từ chối\n• Thời gian phản hồi trung bình\n\n🚀 **Tôi sẽ đưa bạn đến trang yêu cầu đăng ký ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else if (navigationPath === '/admin/users') {
        detailedResponse = `👥 **HƯỚNG DẪN QUẢN LÝ NGƯỜI DÙNG**\n\n📊 **Danh sách người dùng**:\n• Xem tất cả người dùng đã đăng ký\n• Tìm kiếm theo tên, email, số điện thoại\n• Lọc theo trạng thái (active/inactive)\n\n👤 **Thông tin chi tiết**:\n• Xem hồ sơ cá nhân\n• Lịch sử đặt lịch hẹn\n• Lịch sử thanh toán\n• Đánh giá và phản hồi\n\n🔧 **Quản lý tài khoản**:\n• Khóa/mở khóa tài khoản\n• Reset mật khẩu\n• Cập nhật thông tin\n• Xóa tài khoản\n\n📈 **Thống kê**:\n• Số lượng người dùng mới\n• Hoạt động theo thời gian\n• Tỷ lệ retention\n• Doanh thu theo người dùng\n\n🚀 **Tôi sẽ đưa bạn đến trang quản lý người dùng ngay bây giờ!**\n\n💡 **Lưu ý**: Modal chat sẽ vẫn mở để bạn có thể tiếp tục hỏi tôi!`;
      } else {
        detailedResponse = `🚀 **ĐIỀU HƯỚNG THÀNH CÔNG!**\n\n✅ Tôi sẽ đưa bạn đến: **${navigationPath}**\n\n💡 **Lưu ý**: Trang sẽ được mở tự động trong vài giây!`;
      }
      
      return {
        response: detailedResponse,
        navigation: navigationPath
      };
    }
    
    const responses = MOCK_RESPONSES[userRole] || MOCK_RESPONSES.user;
    
    // Check for keywords in the message
    for (const [keyword, response] of Object.entries(responses)) {
      if (message.includes(keyword)) {
        return { response };
      }
    }
    
    // Return default response if no keyword matches
    return { response: DEFAULT_RESPONSES[userRole] || DEFAULT_RESPONSES.user };
  }

  // Get or create AI guide for user
  async getOrCreateAIGuide(userId, userRole) {
    let aiGuide = await AIGuide.findOne({ userId, isActive: true });
    
    if (!aiGuide) {
      aiGuide = new AIGuide({
        userId,
        userRole,
        currentContext: {
          sessionStartTime: new Date(),
        },
      });
      await aiGuide.save();
    }
    
    return aiGuide;
  }

  // Generate mock AI response
  async generateResponse(userId, userRole, userMessage, context = {}) {
    try {
      const aiGuide = await this.getOrCreateAIGuide(userId, userRole);
      
      // Add user message to conversation history
      await aiGuide.addMessage('user', userMessage, context);
      
      // Generate mock response based on message content
      const mockResponse = await this.generateMockResponse(userRole, userMessage);
      
      // Add AI response to conversation history (only save the response string, not the object)
      await aiGuide.addMessage('assistant', mockResponse.response, context);
      
      // Update current context
      await aiGuide.updateContext({
        lastAction: userMessage,
        currentPage: context.currentPage || aiGuide.currentContext.currentPage,
      });

      return {
        response: mockResponse.response,
        conversationId: aiGuide._id,
        context: aiGuide.currentContext,
        navigation: mockResponse.navigation || null, // Add navigation separately
      };
      
    } catch (error) {
      console.error('Mock AI Service Error:', error);
      throw new Error('Không thể tạo phản hồi AI. Vui lòng thử lại sau.');
    }
  }

  // Navigation mapping
  getNavigationPath(message) {
    const messageLower = message.toLowerCase();
    
    // User pages
    if (messageLower.includes('trang chủ') || messageLower.includes('home') || messageLower.includes('chủ')) {
      return '/';
    }
    if (messageLower.includes('đặt lịch') || messageLower.includes('booking') || messageLower.includes('đặt lịch hẹn')) {
      return '/booking';
    }
    if (messageLower.includes('hồ sơ') || messageLower.includes('profile') || messageLower.includes('thông tin cá nhân')) {
      return '/profile';
    }
    if (messageLower.includes('đăng nhập') || messageLower.includes('login')) {
      return '/login';
    }
    if (messageLower.includes('đăng ký user') || messageLower.includes('register user')) {
      return '/register/user';  
    }
    if (messageLower.includes('đăng ký doctor') || messageLower.includes('register doctor')) {
      return '/register/doctor';
    }
    
    // Doctor pages
    if (messageLower.includes('dashboard') || messageLower.includes('bảng điều khiển') || messageLower.includes('trang chủ bác sĩ')) {
      return '/doctor/dashboard';
    }
    if (messageLower.includes('tạo lịch') || messageLower.includes('booking doctor') || messageLower.includes('tạo lịch rảnh')) {
      return '/doctor/booking';
    }
    if (messageLower.includes('yêu cầu đăng ký') || messageLower.includes('pending') || messageLower.includes('yêu cầu')) {
      return '/doctor/pending';
    }
    if (messageLower.includes('hồ sơ bác sĩ') ||     messageLower.includes('doctor profile')) {
      return '/doctor/profile';
    }
    if (messageLower.includes('gói dịch vụ') || messageLower.includes('packages')) {
      return '/doctor/packages';
    }
    if (messageLower.includes('quản lý lịch') || messageLower.includes('pending')) {
        return '/doctor/pending';
      }
      if (messageLower.includes('quản lí lịch') || messageLower.includes('pending')) {
        return '/doctor/pending';
      }
    if (messageLower.includes('lịch sử thanh toán') || messageLower.includes('payment history')) {
      return '/doctor/payment/history';
    }
    
    // Admin pages
    if (messageLower.includes('admin dashboard') || messageLower.includes('dashboard admin')) {
      return '/admin/dashboard';
    }
    if (messageLower.includes('quản lý bác sĩ') || messageLower.includes('doctors')) {
      return '/admin/doctors';
    }
    if (messageLower.includes('quản lý người dùng') || messageLower.includes('users')) {
      return '/admin/users';
    }
    if (messageLower.includes('xét duyệt') || messageLower.includes('pending admin')) {
      return '/admin/doctors/pending';
    }
    
    return null;
  }

  // Get quick help suggestions based on current page
  async getQuickHelp(userId, userRole, currentPage) {
    const pageHelp = {
      // User pages
      '/': 'Hướng dẫn sử dụng website VISIONARY CREW',
      '/booking': 'Hướng dẫn đặt lịch hẹn với bác sĩ',
      '/profile': 'Hướng dẫn quản lý thông tin cá nhân',
      
      // Doctor pages
      '/doctor/booking': 'Hướng dẫn tạo lịch rảnh cho bác sĩ',
      '/doctor/pending': 'Hướng dẫn xem yêu cầu đăng ký',
      '/doctor/dashboard': 'Hướng dẫn quản lý dashboard bác sĩ',
      '/doctor/profile': 'Hướng dẫn cập nhật hồ sơ bác sĩ',
      '/doctor/packages': 'Hướng dẫn mua gói dịch vụ',
      
      // Admin pages
      '/admin/doctors': 'Hướng dẫn quản lý bác sĩ',
      '/admin/users': 'Hướng dẫn quản lý người dùng',
      '/admin/dashboard': 'Hướng dẫn xem thống kê hệ thống',
    };

    // Role-specific suggestions
    const roleSuggestions = {
      user: [
        'Làm thế nào để đặt lịch hẹn?',
        'Cách tìm bác sĩ phù hợp?',
        'Làm sao để huỷ lịch hẹn?',
        'Cách cập nhật thông tin cá nhân?',
        'Xem lịch sử đặt lịch như thế nào?',
        'Thanh toán dịch vụ bằng cách nào?',
        'Khám online có an toàn không?',
        'Làm sao để liên hệ hỗ trợ?',
        'Đưa tôi đến trang đặt lịch',
        'Đưa tôi đến hồ sơ cá nhân'
      ],
      doctor: [
        'Làm thế nào để tạo lịch rảnh?',
        'Cách xem lịch đã được đặt?',
        'Làm sao để cập nhật hồ sơ?',
        'Cách xem thông tin bệnh nhân?',
        'Xem yêu cầu đăng ký như thế nào?',
        'Thống kê hoạt động ở đâu?',
        'Chat với bệnh nhân bằng cách nào?',
        'Mua gói dịch vụ như thế nào?',
        'Đưa tôi đến dashboard',
        'Đưa tôi đến tạo lịch'
      ],
      admin: [
        'Làm thế nào để quản lý bác sĩ?',
        'Cách quản lý người dùng?',
        'Xét duyệt đăng ký như thế nào?',
        'Xem thống kê hệ thống ở đâu?',
        'Cách quản lý hệ thống?',
        'Bảo mật hệ thống như thế nào?',
        'Tạo báo cáo bằng cách nào?',
        'Giám sát hệ thống ở đâu?',
        'Đưa tôi đến quản lý bác sĩ',
        'Đưa tôi đến quản lý người dùng'
      ]
    };

    const suggestions = roleSuggestions[userRole] || roleSuggestions.user;

    if (pageHelp[currentPage]) {
      suggestions.unshift(pageHelp[currentPage]);
    }

    return suggestions;
  }

  // Get user statistics
  async getUserStats(userId) {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    return aiGuide ? aiGuide.statistics : null;
  }

  // Reset conversation history
  async resetConversation(userId) {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    if (aiGuide) {
      aiGuide.conversationHistory = [];
      aiGuide.currentContext = {
        sessionStartTime: new Date(),
      };
      await aiGuide.save();
    }
    return true;
  }
}

export default new MockAIService(); 
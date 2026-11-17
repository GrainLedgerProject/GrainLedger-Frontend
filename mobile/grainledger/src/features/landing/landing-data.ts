// Static public content/demonstration data from ReactJS Landing. English copy translates the same concepts.
export type LandingLocale = 'vi' | 'en';
export type LandingTone = 'primary' | 'info' | 'warning' | 'danger';
export type StakeholderId = 'MILL' | 'EXPORTER' | 'FARMER' | 'AUDIT';
export interface ContextCard { metric: string; unit?: string; title: string; desc: string; badge: string; tone: LandingTone }
export interface Pillar { title: string; desc: string; tag: string; tone: LandingTone }
export interface Stakeholder { id: StakeholderId; label: string; eyebrow: string; title: string; desc: string; benefits: string[]; sample: string[] }
export interface LandingContent { heroTitle: string; heroDescription: string; signInLabel: string; problem: ContextCard[]; pillars: Pillar[]; comparisons: {criteria:string;oldWay:string;newWay:string}[]; stakeholders: Stakeholder[] }

export const landingContent: Record<LandingLocale, LandingContent> = {
  "vi": {
    "heroTitle": "Mỗi kilogram đều được đối chiếu rõ ràng.",
    "heroDescription": "GrainLedger ghi nhận dòng chảy khối lượng từ ruộng lúa nông hộ đến container xuất khẩu trên sổ cái lưu giữ chỉ-ghi-thêm — giúp doanh nghiệp chứng minh nguồn gốc, vượt qua kiểm định MRL và truy vết tức thời.",
    "signInLabel": "Đăng nhập vào hệ thống",
    "problem": [
      {
        "metric": "8,06M",
        "title": "Tấn gạo xuất khẩu / năm",
        "desc": "Giá trị kim ngạch hơn 4,1 tỷ USD của Việt Nam đòi hỏi chứng minh nguồn gốc minh bạch với đối tác toàn cầu.",
        "badge": "Sản lượng",
        "tone": "primary"
      },
      {
        "metric": "0,01",
        "unit": "mg/kg",
        "title": "Ngưỡng MRL EU (LOQ)",
        "desc": "Quy định khắt khe của EU với hoạt chất Tricyclazole — chỉ một mẻ nhiễm bẩn có thể khiến toàn bộ container bị từ chối cập cảng.",
        "badge": "Rủi ro MRL",
        "tone": "danger"
      },
      {
        "metric": "100%",
        "title": "Khối lượng được bảo toàn",
        "desc": "Sổ cái cân bằng kép từ chối dứt khoát mọi mẻ chế biến sai lệch ngoài dung sai 0,5% — không cho phép gian lận hoặc double-spending.",
        "badge": "Mass Balance",
        "tone": "primary"
      },
      {
        "metric": "< 30s",
        "title": "Truy vết đồ thị hai chiều",
        "desc": "Định vị chính xác từ lọ mẫu lab đến container xuất khẩu, và từ container ngược về danh sách nông hộ kèm tỷ lệ % khối lượng.",
        "badge": "Đồ thị truy vết",
        "tone": "info"
      }
    ],
    "pillars": [
      {
        "title": "Sổ cái Cân bằng Khối lượng",
        "desc": "Áp dụng mô hình Mass Balance ISO 22095. Tổng đầu ra cộng hao hụt phải bằng tổng đầu vào trong phạm vi dung sai (0,5%). Mọi vi phạm bị từ chối ở tầng dữ liệu.",
        "tag": "Bất biến",
        "tone": "primary"
      },
      {
        "title": "Động cơ Dư lượng MRL",
        "desc": "Tự động gán cận bảo thủ 95% cho các lô chưa xét nghiệm, áp dụng hệ số chế biến phân đoạn (gạo nguyên, tấm, cám) và trừ biên an toàn 20% khi duyệt phương án.",
        "tag": "Toán học",
        "tone": "info"
      },
      {
        "title": "Thu mua Ngoại tuyến Hiện trường",
        "desc": "Ứng dụng web hoạt động hoàn hảo khi mất mạng tại bờ ruộng. Ghi toạ độ thửa đất, khai báo phun thuốc và đồng bộ chống trùng lặp (Idempotent) khi có sóng.",
        "tag": "Offline-First",
        "tone": "warning"
      },
      {
        "title": "Truy vết & Khóa HOLD",
        "desc": "Ban hành lệnh HOLD tức thì để ngăn chặn xuất xưởng khi phát hiện nguy cơ. Truy vết đồ thị hai chiều và sinh Hồ sơ tuân thủ (Digital Dossier) tự động.",
        "tag": "Cô lập rủi ro",
        "tone": "danger"
      }
    ],
    "comparisons": [
      {
        "criteria": "Trộn lúa trong Silo",
        "oldWay": "Mất hoàn toàn dấu vết nguồn gốc sau khi đổ lúa của nhiều nông dân vào silo chung.",
        "newWay": "Bảo toàn tỷ lệ khối lượng: Xác định chính xác từng thửa ruộng đóng góp bao nhiêu % vào mẻ gạo xuất khẩu."
      },
      {
        "criteria": "Khi có kết quả Lab xấu",
        "oldWay": "Không biết container nào bị nhiễm; phải phong toả toàn bộ kho hoặc đối mặt rủi ro bị nước nhập khẩu phạt.",
        "newWay": "Truy vết đồ thị trong 30s: Chỉ ra chính xác các container bị ảnh hưởng và khối lượng kg nhiễm để cách ly tức thời."
      },
      {
        "criteria": "Kiểm soát hao hụt & Thất thoát",
        "oldWay": "Dễ khai khống, gõ nhầm hoặc tạo số liệu ảo mà hệ thống sổ sách không ngăn chặn được.",
        "newWay": "Từ chối tuyệt đối: Giao dịch không cân bằng theo dung sai 0,5% bị huỷ ngay lập tức ở tầng dữ liệu."
      },
      {
        "criteria": "Duyệt xuất khẩu MRL",
        "oldWay": "Phỏng đoán cảm tính, phụ thuộc vào kinh nghiệm người phối trộn gạo.",
        "newWay": "Tính toán toán học bảo thủ: Kiểm tra nồng độ theo phiên bản MRL của thị trường đích kèm biên an toàn 20%."
      }
    ],
    "stakeholders": [
      {
        "id": "MILL",
        "label": "Nhà máy Xay xát & Sấy lúa",
        "eyebrow": "Dành cho Ban Điều hành Nhà máy",
        "title": "Minh bạch sản lượng sấy, xay xát và lưu trữ silo",
        "desc": "Cung cấp dịch vụ sấy, silo và xay xát cho nhiều công ty xuất khẩu mà không lo tranh chấp về hao hụt ẩm hay tỷ lệ thu hồi thành phẩm, tấm và cám.",
        "benefits": [
          "Hạch toán hao hụt theo từng mẻ máy có số đo cân đối chiếu",
          "Cách ly tuyệt đối lô hàng của từng công ty khách hàng",
          "Xử lý bút toán bù chuẩn mực khi có hiệu chỉnh số cân"
        ],
        "sample": [
          "Mẫu báo cáo mẻ xay xát S1",
          "100% Cân bằng",
          "Thóc khô đưa vào:",
          "88.000,000 kg",
          "Gạo nguyên thu hồi:",
          "58.000,000 kg (65.9%)",
          "Tấm + Cám + Trấu:",
          "29.700,000 kg (33.8%)",
          "Hao hụt máy:",
          "300,000 kg (0.3%)"
        ]
      },
      {
        "id": "EXPORTER",
        "label": "Doanh nghiệp Xuất khẩu",
        "eyebrow": "Dành cho Doanh nghiệp Xuất khẩu",
        "title": "Bảo đảm từng container đạt chuẩn thị trường đích",
        "desc": "Tối ưu hóa các mẻ phối trộn đạt tiêu chuẩn tỷ lệ tấm, độ ẩm và dư lượng hoạt chất dưới ngưỡng MRL mà không lo bị từ chối đơn hàng.",
        "benefits": [
          "Thuật toán đề xuất mẻ trộn tối ưu lợi nhuận và an toàn MRL",
          "Xuất hồ sơ tuân thủ kèm QR truy xuất nguồn gốc số hoá",
          "Giám sát tiến độ đóng niêm container trực tiếp thời gian thực"
        ],
        "sample": [
          "Hồ sơ xuất xưởng Container C1",
          "Đạt chuẩn EU",
          "Thị trường đích:",
          "Châu Âu (Regulation EC 396)",
          "Khối lượng tịnh:",
          "25.000,000 kg",
          "Số niêm chì:",
          "GL-SEAL-8891"
        ]
      },
      {
        "id": "FARMER",
        "label": "Nông hộ & Tổ hợp tác",
        "eyebrow": "Dành cho Nông hộ & Hợp tác xã",
        "title": "Ghi nhận công sức canh tác bền vững",
        "desc": "Nông dân được định danh thửa ruộng trên bản đồ GPS, lưu lại lịch sử canh tác an toàn và nhận đúng giá trị lúa chất lượng cao.",
        "benefits": [
          "Phiếu cân điện tử tại bờ ruộng có toạ độ định vị",
          "Lấy mẫu niêm phong đại diện bảo đảm quyền lợi đôi bên"
        ],
        "sample": [
          "Thửa ruộng L1 — Cái Bè",
          "1.8 ha · OM5451",
          "Nông hộ Nguyễn Văn An · Đã thu hoạch 50.000 kg lúa tươi đạt chuẩn độ ẩm 26,5%."
        ]
      },
      {
        "id": "AUDIT",
        "label": "Cơ quan Kiểm định & Hải quan",
        "eyebrow": "Dành cho Cơ quan Kiểm định & Hải quan",
        "title": "Truy xuất tức thời không thể làm giả",
        "desc": "Dữ liệu lưu giữ bất biến trên sổ cái kỹ thuật số, kèm kết quả thử nghiệm từ phòng thí nghiệm ISO/IEC 17025.",
        "benefits": [
          "Liên kết trực tiếp tới chứng thư kiểm nghiệm phân tích",
          "Truy vết toán học tỷ lệ phần trăm khối lượng nguồn gốc"
        ],
        "sample": [
          "Chứng thư tuân thủ xuất khẩu",
          "ISO 17025",
          "Chứng thực lô hàng đạt chuẩn kiểm dịch thực vật và kiểm tra dư lượng thuốc trừ sâu theo tiêu chuẩn quốc tế."
        ]
      }
    ]
  },
  "en": {
    "heroTitle": "Every kilogram accounted for.",
    "heroDescription": "GrainLedger records the mass flow from smallholder paddy fields to export containers on an append-only custody ledger — helping agribusinesses prove origin, clear MRL tests, and trace instantly.",
    "signInLabel": "Sign In to System",
    "problem": [
      {
        "metric": "8.06M",
        "title": "Tonnes of rice exported per year",
        "desc": "The project context cites over USD 4.1 billion in export value, motivating transparent provenance for global trading partners.",
        "badge": "Production",
        "tone": "primary"
      },
      {
        "metric": "0.01",
        "unit": "mg/kg",
        "title": "EU MRL threshold (LOQ)",
        "desc": "The source project highlights Tricyclazole residue risk: a contaminated batch can affect an entire export container.",
        "badge": "MRL risk",
        "tone": "danger"
      },
      {
        "metric": "100%",
        "title": "Mass accounted for",
        "desc": "The source ledger model rejects a processing batch outside its illustrated 0.5% tolerance.",
        "badge": "Mass Balance",
        "tone": "primary"
      },
      {
        "metric": "< 30s",
        "title": "Bidirectional traceability",
        "desc": "The project describes linking laboratory samples to export containers and tracing container mass back to contributing farms.",
        "badge": "Traceability",
        "tone": "info"
      }
    ],
    "pillars": [
      {
        "title": "Mass-balance custody ledger",
        "desc": "ISO 22095 mass-balance model: outputs plus declared losses must equal inputs within the illustrated 0.5% tolerance.",
        "tag": "Append-only",
        "tone": "primary"
      },
      {
        "title": "MRL residue engine",
        "desc": "The source model combines conservative bounds for untested lots, processing factors and a 20% safety margin.",
        "tag": "Mathematics",
        "tone": "info"
      },
      {
        "title": "Offline field procurement",
        "desc": "The web application captures plot coordinates and spray declarations offline, then synchronizes with idempotent operations.",
        "tag": "Offline-first",
        "tone": "warning"
      },
      {
        "title": "Traceability and HOLD",
        "desc": "The project describes isolating risky lots with HOLD, tracing provenance in both directions and producing compliance evidence.",
        "tag": "Risk isolation",
        "tone": "danger"
      }
    ],
    "comparisons": [
      {
        "criteria": "Mixing paddy in a silo",
        "oldWay": "Individual farm provenance is lost when deliveries are mixed in a shared silo.",
        "newWay": "Mass proportions link each contributing plot to the export batch."
      },
      {
        "criteria": "An adverse laboratory result",
        "oldWay": "Affected containers are unclear, creating broad quarantine or rejection risk.",
        "newWay": "The source model traces affected containers and quantities for targeted isolation."
      },
      {
        "criteria": "Losses and missing stock",
        "oldWay": "Manual entries can introduce errors or unsupported stock figures.",
        "newWay": "The illustrated ledger rejects an imbalance outside its 0.5% tolerance."
      },
      {
        "criteria": "MRL export assessment",
        "oldWay": "Blending decisions depend on individual experience.",
        "newWay": "The model applies the destination MRL version and a 20% safety margin."
      }
    ],
    "stakeholders": [
      {
        "id": "MILL",
        "label": "Mills and dryers",
        "eyebrow": "For mill operations",
        "title": "Clear drying, milling and silo records",
        "desc": "Track services for multiple exporters while accounting for moisture losses and recovered products.",
        "benefits": [
          "Batch loss accounting backed by measurements",
          "Separate each customer organization's lots",
          "Controlled correction entries for weighing changes"
        ],
        "sample": [
          "Illustrative milling batch S1",
          "Balanced",
          "Dry paddy: 88,000.000 kg",
          "Head rice: 58,000.000 kg (65.9%)",
          "Broken rice, bran and husk: 29,700.000 kg (33.8%)",
          "Machine loss: 300.000 kg (0.3%)"
        ]
      },
      {
        "id": "EXPORTER",
        "label": "Export companies",
        "eyebrow": "For exporters",
        "title": "Plan for the destination market",
        "desc": "Assess blending against broken-rice, moisture and residue requirements in the project model.",
        "benefits": [
          "Blending proposals balancing value and MRL safety",
          "Compliance evidence with digital provenance",
          "Container closure progress"
        ],
        "sample": [
          "Illustrative container C1",
          "EU scenario",
          "Destination: Europe (Regulation EC 396)",
          "Net mass: 25,000.000 kg",
          "Seal: GL-SEAL-8891"
        ]
      },
      {
        "id": "FARMER",
        "label": "Farmers and cooperatives",
        "eyebrow": "For farmers and cooperatives",
        "title": "Recognize careful cultivation",
        "desc": "Link plots, cultivation records and quality paddy to their source.",
        "benefits": [
          "Geolocated field weighing records",
          "Sealed representative samples for both parties"
        ],
        "sample": [
          "Illustrative plot L1, Cai Be",
          "1.8 ha ? OM5451",
          "Nguyen Van An ? 50,000 kg paddy ? 26.5% moisture"
        ]
      },
      {
        "id": "AUDIT",
        "label": "Auditors and customs",
        "eyebrow": "For auditors and customs",
        "title": "Inspect linked provenance and evidence",
        "desc": "The project describes append-only records linked to ISO/IEC 17025 laboratory evidence.",
        "benefits": [
          "Links to analytical laboratory reports",
          "Mass-percentage provenance tracing"
        ],
        "sample": [
          "Illustrative export evidence",
          "ISO 17025",
          "Phytosanitary and pesticide-residue evidence for an export batch."
        ]
      }
    ]
  }
};

// Historical SRS demo matrix, not current regulatory data or a backend response.
export const MRL_DEMO = {
  "TCZ": {
    "name": "Tricyclazole (Đặc trị đạo ôn)",
    "code": "TCZ001",
    "cas": "41814-78-2",
    "risk": "EXTREME",
    "limits": {
      "EU": {
        "limit": 0.01,
        "unit": "mg/kg",
        "basis": "LOQ MRL (EC 396/2005)",
        "safeMargin": 0.008
      },
      "USA": {
        "limit": 3,
        "unit": "mg/kg",
        "basis": "EPA 40 CFR 180",
        "safeMargin": 2.4
      },
      "JAPAN": {
        "limit": 3,
        "unit": "mg/kg",
        "basis": "MHLW Positive List (Brown)",
        "safeMargin": 2.4
      },
      "KOREA": {
        "limit": 0.7,
        "unit": "mg/kg",
        "basis": "MFDS Food Code",
        "safeMargin": 0.56
      }
    },
    "currentMeasured": 0.0075
  },
  "IPT": {
    "name": "Isoprothiolane (Trừ đạo ôn & rầy nâu)",
    "code": "IPT002",
    "cas": "50512-35-1",
    "risk": "LOW",
    "limits": {
      "EU": {
        "limit": 6,
        "unit": "mg/kg",
        "basis": "EC 396/2005",
        "safeMargin": 4.8
      },
      "USA": {
        "limit": 6,
        "unit": "mg/kg",
        "basis": "EPA 40 CFR (Husked)",
        "safeMargin": 4.8
      },
      "JAPAN": {
        "limit": 7,
        "unit": "mg/kg",
        "basis": "MHLW Positive List",
        "safeMargin": 5.6
      },
      "KOREA": {
        "limit": 2,
        "unit": "mg/kg",
        "basis": "MFDS Food Code",
        "safeMargin": 1.6
      }
    },
    "currentMeasured": 1.25
  },
  "HXC": {
    "name": "Hexaconazole (Trừ nấm & khô vằn)",
    "code": "HXC003",
    "cas": "79983-71-4",
    "risk": "HIGH",
    "limits": {
      "EU": {
        "limit": 0.01,
        "unit": "mg/kg",
        "basis": "LOQ MRL",
        "safeMargin": 0.008
      },
      "USA": {
        "limit": 0.05,
        "unit": "mg/kg",
        "basis": "EPA Default",
        "safeMargin": 0.04
      },
      "JAPAN": {
        "limit": 0.01,
        "unit": "mg/kg",
        "basis": "Uniform Standard",
        "safeMargin": 0.008
      },
      "KOREA": {
        "limit": 0.3,
        "unit": "mg/kg",
        "basis": "MFDS Rice Limit",
        "safeMargin": 0.24
      }
    },
    "currentMeasured": 0.0095
  }
} as const;

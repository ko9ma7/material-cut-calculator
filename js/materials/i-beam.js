// 기존 계산기 자재표에서 분리한 I빔 규격입니다.
// 규격 추가/수정 시 { spec: "규격", kgPerM: 단위중량 } 형식을 유지하세요.
export default {
  "id": "i-beam",
  "label": "I빔",
  "materials": {
    "스테인리스": [
      {
        "spec": "100x50x5x7",
        "kgPerM": 9.36
      }
    ],
    "철": [
      {
        "spec": "100x50x5x7",
        "kgPerM": 9.36
      },
      {
        "spec": "125x63x5.5x8",
        "kgPerM": 11.6
      },
      {
        "spec": "150x75x6x9",
        "kgPerM": 14.8
      },
      {
        "spec": "200x100x7x10",
        "kgPerM": 22
      },
      {
        "spec": "250x125x8x12",
        "kgPerM": 30
      },
      {
        "spec": "300x150x9x13",
        "kgPerM": 40
      },
      {
        "spec": "350x175x10x14",
        "kgPerM": 50
      },
      {
        "spec": "400x200x11x16",
        "kgPerM": 60
      },
      {
        "spec": "450x225x12x18",
        "kgPerM": 70
      },
      {
        "spec": "500x250x13x20",
        "kgPerM": 80
      }
    ]
  }
};

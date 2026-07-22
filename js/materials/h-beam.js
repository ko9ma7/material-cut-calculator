// 기존 계산기 자재표에서 분리한 H빔 규격입니다.
// 규격 추가/수정 시 { spec: "규격", kgPerM: 단위중량 } 형식을 유지하세요.
export default {
  "id": "h-beam",
  "label": "H빔",
  "materials": {
    "스테인리스": [
      {
        "spec": "100x100x6x8 (임의)",
        "kgPerM": 17.2
      }
    ],
    "철": [
      {
        "spec": "100x50x5x7",
        "kgPerM": 9.3
      },
      {
        "spec": "100x100x6x8",
        "kgPerM": 17.2
      },
      {
        "spec": "125x60x6x8",
        "kgPerM": 13.2
      },
      {
        "spec": "125x125x6.5x9",
        "kgPerM": 23.8
      },
      {
        "spec": "150x75x5x7",
        "kgPerM": 14
      },
      {
        "spec": "150x100x6x9",
        "kgPerM": 21.1
      },
      {
        "spec": "150x150x7x10",
        "kgPerM": 31.5
      },
      {
        "spec": "175x90x5x8",
        "kgPerM": 18.1
      },
      {
        "spec": "175x175x7.5x11",
        "kgPerM": 40.2
      },
      {
        "spec": "200x100x5.5x8",
        "kgPerM": 21.3
      },
      {
        "spec": "200x200x8x12",
        "kgPerM": 49.9
      },
      {
        "spec": "250x125x6x9",
        "kgPerM": 29.6
      },
      {
        "spec": "250x250x9x14",
        "kgPerM": 72.4
      },
      {
        "spec": "300x150x6.5x9",
        "kgPerM": 36.7
      },
      {
        "spec": "300x300x10x15",
        "kgPerM": 94
      },
      {
        "spec": "350x175x7x11",
        "kgPerM": 49.6
      },
      {
        "spec": "350x350x12x19",
        "kgPerM": 137
      },
      {
        "spec": "400x200x8x13",
        "kgPerM": 66
      },
      {
        "spec": "400x400x13x21",
        "kgPerM": 172
      }
    ]
  }
};

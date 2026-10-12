window.QBOT_SCREENS = [
  {
    "id": "D0",
    "title": "桌面 · 收起",
    "kind": "desktop",
    "blocks": [],
    "weather": true
  },
  {
    "id": "D1",
    "title": "桌面 · 一起工作",
    "kind": "desktop",
    "blocks": [],
    "work": true
  },
  {
    "id": "D2",
    "title": "屏幕下方 · 向上展开",
    "kind": "phone",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "我的房间",
            "icon": "home",
            "to": "P1"
          },
          {
            "label": "朋友圈",
            "icon": "moments",
            "to": "P2"
          },
          {
            "label": "旅行",
            "icon": "travel",
            "to": "P3"
          },
          {
            "label": "关系",
            "icon": "heart",
            "to": "P6"
          },
          {
            "label": "补给站",
            "icon": "capsule",
            "to": "K0"
          },
          {
            "label": "回忆",
            "icon": "book",
            "to": "P8"
          }
        ],
        "cols": 3,
        "h": 112
      }
    ],
    "heading": "小企鹅",
    "upper": true
  },
  {
    "id": "D3",
    "title": "全局隐藏 · 保留工具栏",
    "kind": "desktop",
    "blocks": [],
    "hidden": true
  },
  {
    "id": "C0",
    "title": "聊天 · 单人",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet"
      },
      {
        "type": "text",
        "value": "今天想做什么？",
        "style": "body"
      },
      {
        "type": "input",
        "label": "",
        "value": "种一颗草莓",
        "to": "C3",
        "h": 70
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "image",
            "to": "C4"
          },
          {
            "icon": "smile",
            "to": "C5"
          },
          {
            "icon": "send",
            "to": "C3"
          }
        ]
      },
      {
        "type": "row",
        "label": "聊天记录",
        "icon": "chat",
        "meta": null,
        "to": "C6"
      }
    ],
    "heading": "小企鹅"
  },
  {
    "id": "C1",
    "title": "聊天 · 多人房间",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "公共",
            "to": "C1",
            "kind": "selected"
          },
          {
            "label": "私人",
            "to": "C2"
          }
        ]
      },
      {
        "type": "row",
        "label": "房间 · 茶室",
        "icon": "users",
        "meta": "3 人在线"
      },
      {
        "type": "text",
        "value": "阿圆：刚收了一颗金色草莓。",
        "style": "body"
      },
      {
        "type": "input",
        "label": "",
        "value": "一起去看看",
        "to": "C7",
        "h": 70
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "image",
            "to": "C4"
          },
          {
            "icon": "smile",
            "to": "C5"
          },
          {
            "icon": "send",
            "to": "C7"
          }
        ]
      },
      {
        "type": "row",
        "label": "聊天记录",
        "icon": "chat",
        "meta": null,
        "to": "C6"
      }
    ],
    "online": true,
    "heading": "聊天"
  },
  {
    "id": "C2",
    "title": "聊天 · 多人中的私人",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "公共",
            "to": "C1"
          },
          {
            "label": "私人",
            "to": "C2",
            "kind": "selected"
          }
        ]
      },
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet"
      },
      {
        "type": "text",
        "value": "今天想做什么？",
        "style": "body"
      },
      {
        "type": "input",
        "label": "",
        "value": "种一颗草莓",
        "to": "C3",
        "h": 70
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "image",
            "to": "C4"
          },
          {
            "icon": "smile",
            "to": "C5"
          },
          {
            "icon": "send",
            "to": "C3"
          }
        ]
      }
    ],
    "online": true,
    "heading": "聊天"
  },
  {
    "id": "C3",
    "title": "聊天 · 回复与等待",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "我",
        "icon": "chat",
        "meta": "种一颗草莓"
      },
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "去花园选颗种子吧。"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "打开花园",
            "to": "G0"
          }
        ]
      },
      {
        "type": "input",
        "label": "",
        "value": ""
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "image",
            "to": "C4"
          },
          {
            "icon": "smile",
            "to": "C5"
          },
          {
            "icon": "send",
            "to": "C8"
          }
        ]
      }
    ],
    "heading": "小企鹅",
    "back": "C0"
  },
  {
    "id": "C4",
    "title": "聊天 · 图片附件",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "photo",
        "h": 120,
        "targets": {}
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "移除",
            "to": "C0"
          }
        ]
      },
      {
        "type": "input",
        "label": "",
        "value": "看看这张图"
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "send",
            "to": "C3"
          }
        ]
      }
    ],
    "heading": "图片",
    "back": "C0"
  },
  {
    "id": "C5",
    "title": "聊天 · 表情选择",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "开心",
            "icon": "smile",
            "to": "C3"
          },
          {
            "label": "喜欢",
            "icon": "heart",
            "to": "C3"
          },
          {
            "label": "摸摸",
            "icon": "pet",
            "to": "C3"
          },
          {
            "label": "惊喜",
            "icon": "star",
            "to": "C3"
          },
          {
            "label": "礼物",
            "icon": "gift",
            "to": "C3"
          },
          {
            "label": "种植",
            "icon": "plant",
            "to": "C3"
          }
        ],
        "cols": 3,
        "h": 108
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "最近",
            "to": "C5",
            "kind": "selected"
          },
          {
            "label": "收藏",
            "to": "C5"
          }
        ]
      }
    ],
    "heading": "表情",
    "back": "C0"
  },
  {
    "id": "C6",
    "title": "聊天记录",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "今天 09:41",
        "icon": "chat",
        "meta": "我：种一颗草莓"
      },
      {
        "type": "row",
        "label": "今天 09:42",
        "icon": "pet",
        "meta": "小企鹅：去花园选颗种子吧。"
      },
      {
        "type": "row",
        "label": "昨天 18:32",
        "icon": "pet",
        "meta": "晚安。"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "清空",
            "to": "E5"
          }
        ]
      }
    ],
    "heading": "聊天记录",
    "back": "C0"
  },
  {
    "id": "C7",
    "title": "聊天 · 公共消息已发送",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "公共",
            "to": "C7",
            "kind": "selected"
          },
          {
            "label": "私人",
            "to": "C2"
          }
        ]
      },
      {
        "type": "row",
        "label": "茶室",
        "icon": "users",
        "meta": "3 人在线"
      },
      {
        "type": "text",
        "value": "阿圆：刚收了一颗金色草莓。",
        "style": "body"
      },
      {
        "type": "text",
        "value": "我：一起去看看",
        "style": "body"
      },
      {
        "type": "input",
        "label": "",
        "value": ""
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "send",
            "to": "C7"
          }
        ]
      }
    ],
    "online": true,
    "heading": "聊天"
  },
  {
    "id": "C8",
    "title": "聊天 · 发送失败",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "我",
        "icon": "chat",
        "meta": "种一颗草莓"
      },
      {
        "type": "row",
        "label": "发送失败",
        "icon": "refresh",
        "meta": null,
        "to": "C3",
        "action": "重试"
      },
      {
        "type": "input",
        "label": "",
        "value": "种一颗草莓"
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "send",
            "to": "C3"
          }
        ]
      }
    ],
    "heading": "小企鹅",
    "back": "C0"
  },
  {
    "id": "P0",
    "title": "手机 · 应用首页",
    "kind": "phone",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "我的房间",
            "icon": "home",
            "to": "P1"
          },
          {
            "label": "朋友圈",
            "icon": "moments",
            "to": "P2"
          },
          {
            "label": "旅行",
            "icon": "travel",
            "to": "P3"
          },
          {
            "label": "关系",
            "icon": "heart",
            "to": "P6"
          },
          {
            "label": "补给站",
            "icon": "capsule",
            "to": "K0"
          },
          {
            "label": "回忆",
            "icon": "book",
            "to": "P8"
          }
        ],
        "cols": 3,
        "h": 112
      }
    ],
    "heading": "小企鹅"
  },
  {
    "id": "P1",
    "title": "我的房间 · 3D 参观与家具背包",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "小企鹅的房间",
    "back": "P0",
    "space": "room"
  },
  {
    "id": "P2",
    "title": "手机 · 朋友圈",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "今天 09:42"
      },
      {
        "type": "scene",
        "kind": "photo",
        "h": 105,
        "targets": {}
      },
      {
        "type": "text",
        "value": "今天收到了第一颗草莓。",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "heart",
            "to": "P11"
          },
          {
            "icon": "more",
            "to": "P12"
          }
        ]
      },
      {
        "type": "row",
        "label": "巴黎 · 花园漫步",
        "icon": "image",
        "meta": "昨天 · 旅行照片",
        "to": "P5"
      }
    ],
    "heading": "朋友圈",
    "back": "P0"
  },
  {
    "id": "P3",
    "title": "手机 · 旅行地图",
    "kind": "phone",
    "blocks": [
      {
        "type": "scene",
        "kind": "map",
        "h": 190,
        "targets": {
          "0": "P4",
          "1": "P4",
          "2": "P4"
        }
      },
      {
        "type": "row",
        "label": "巴黎",
        "icon": "travel",
        "meta": "已解锁",
        "to": "P4"
      }
    ],
    "heading": "旅行",
    "back": "P0"
  },
  {
    "id": "P4",
    "title": "旅行 · 目的地",
    "kind": "phone",
    "blocks": [
      {
        "type": "scene",
        "kind": "photo",
        "h": 145,
        "targets": {}
      },
      {
        "type": "text",
        "value": "巴黎",
        "style": "heading"
      },
      {
        "type": "row",
        "label": "花园漫步",
        "icon": "plant",
        "meta": "◉ 300",
        "to": "P5",
        "action": "出发"
      }
    ],
    "heading": "巴黎",
    "back": "P3"
  },
  {
    "id": "P5",
    "title": "朋友圈 · 旅行动态",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "10月11日 · 旅行"
      },
      {
        "type": "scene",
        "kind": "photo",
        "h": 168,
        "targets": {}
      },
      {
        "type": "text",
        "value": "巴黎 · 花园漫步",
        "style": "label"
      },
      {
        "type": "buttons",
        "items": [
          {
            "icon": "heart",
            "toggle": "travelLike",
            "title": "点赞"
          },
          {
            "icon": "image",
            "to": "P12"
          }
        ]
      }
    ],
    "heading": "朋友圈",
    "back": "P2"
  },
  {
    "id": "P6",
    "title": "手机 · 角色关系",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "吴邪",
        "icon": "pet",
        "meta": "相处投契 · 125",
        "to": "P7"
      },
      {
        "type": "row",
        "label": "张起灵",
        "icon": "pet",
        "meta": "渐渐熟悉 · 45",
        "to": "P7"
      },
      {
        "type": "row",
        "label": "阿圆的角色",
        "icon": "pet",
        "meta": "初次相识 · 10",
        "to": "P7"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "特别关注",
            "to": "P6"
          },
          {
            "label": "全部",
            "to": "P6",
            "kind": "selected"
          }
        ]
      }
    ],
    "heading": "关系",
    "back": "P0"
  },
  {
    "id": "P7",
    "title": "关系 · 详情",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "吴邪",
        "icon": "pet",
        "meta": "相处投契 · 125"
      },
      {
        "type": "progress",
        "label": "125 / 300",
        "value": 0.42
      },
      {
        "type": "input",
        "label": "称呼",
        "value": "朋友"
      },
      {
        "type": "input",
        "label": "昵称",
        "value": "吴邪"
      },
      {
        "type": "row",
        "label": "共同经历",
        "icon": "heart",
        "meta": "一起喝茶 · 今天",
        "to": "P8"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "保存",
            "to": "P6"
          },
          {
            "label": "互动",
            "to": "M4"
          }
        ]
      }
    ],
    "heading": "吴邪",
    "back": "P6"
  },
  {
    "id": "P8",
    "title": "手机 · 共同回忆",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "第一次收获",
        "icon": "plant",
        "meta": "10月11日",
        "to": "P9"
      },
      {
        "type": "row",
        "label": "喜欢草莓",
        "icon": "heart",
        "meta": "你说过的话",
        "to": "P9"
      },
      {
        "type": "row",
        "label": "巴黎旅行",
        "icon": "travel",
        "meta": "10月10日",
        "to": "P5"
      }
    ],
    "heading": "回忆",
    "back": "P0"
  },
  {
    "id": "P9",
    "title": "回忆 · 编辑与遗忘",
    "kind": "phone",
    "blocks": [
      {
        "type": "input",
        "label": "内容",
        "value": "喜欢草莓",
        "to": null,
        "h": 70
      },
      {
        "type": "toggle",
        "label": "主动提及",
        "on": true,
        "to": "P9"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "保存",
            "to": "P8"
          },
          {
            "label": "遗忘",
            "to": "E4"
          }
        ]
      }
    ],
    "heading": "回忆",
    "back": "P8"
  },
  {
    "id": "P10",
    "title": "房间 · 桌面显示开启",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "小企鹅的房间",
    "back": "P0",
    "space": "room"
  },
  {
    "id": "P11",
    "title": "朋友圈 · 已点赞",
    "kind": "phone",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "今天 09:42"
      },
      {
        "type": "scene",
        "kind": "photo",
        "h": 105,
        "targets": {}
      },
      {
        "type": "text",
        "value": "今天收到了第一颗草莓。",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "♥ 1",
            "to": "P2",
            "kind": "selected"
          },
          {
            "icon": "more",
            "to": "P12"
          }
        ]
      },
      {
        "type": "row",
        "label": "巴黎 · 花园漫步",
        "icon": "image",
        "meta": "昨天 · 旅行照片",
        "to": "P5"
      }
    ],
    "heading": "朋友圈",
    "back": "P0"
  },
  {
    "id": "P12",
    "title": "照片 · 查看与保存",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "photo",
            "h": 425,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "巴黎 · 花园漫步",
            "style": "heading"
          },
          {
            "type": "text",
            "value": "10月11日",
            "style": "body"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存图片",
                "to": "P5"
              },
              {
                "label": "关闭",
                "to": "P5"
              }
            ]
          }
        ]
      }
    ],
    "heading": "照片",
    "back": "P5",
    "close": "P5"
  },
  {
    "id": "G0",
    "title": "花园 · 3D 场景与种子背包",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "icon": "bag",
            "to": "G4",
            "label": "背包"
          },
          {
            "icon": "book",
            "to": "G6",
            "label": "图鉴"
          },
          {
            "icon": "shop",
            "to": "G8",
            "label": "商店"
          },
          {
            "icon": "users",
            "to": "G10",
            "label": "朋友"
          }
        ]
      },
      {
        "type": "tabs",
        "items": [
          {
            "label": "种子",
            "to": "G0",
            "kind": "selected"
          },
          {
            "label": "果实",
            "to": "G4"
          },
          {
            "label": "道具",
            "to": "G13"
          }
        ]
      },
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "草莓种子",
            "icon": "plant",
            "meta": "× 8",
            "to": "G0"
          },
          {
            "label": "菠萝种子",
            "icon": "plant",
            "meta": "× 3",
            "to": "G0"
          },
          {
            "label": "蓝莓种子",
            "icon": "plant",
            "meta": "× 2",
            "to": "G0"
          }
        ]
      }
    ],
    "heading": "花园",
    "weather": true,
    "space": "garden"
  },
  {
    "id": "G1",
    "title": "花园 · 选择种子",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "草莓",
            "icon": "plant",
            "meta": "× 8",
            "to": "G3"
          },
          {
            "label": "菠萝",
            "icon": "plant",
            "meta": "× 3",
            "to": "G3"
          },
          {
            "label": "蓝莓",
            "icon": "plant",
            "meta": "× 2",
            "to": "G3"
          }
        ],
        "cols": 3,
        "h": 108
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "播种",
            "to": "G3",
            "kind": "selected"
          }
        ]
      },
      {
        "type": "row",
        "label": "买种子",
        "icon": "shop",
        "meta": null,
        "to": "G8"
      }
    ],
    "heading": "播种",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G2",
    "title": "花园 · 成熟作物",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "plant",
        "h": 115,
        "targets": {}
      },
      {
        "type": "text",
        "value": "草莓",
        "style": "heading"
      },
      {
        "type": "text",
        "value": "金色 · 1.28 kg",
        "style": "body"
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "闪亮",
            "icon": "star"
          },
          {
            "label": "蜜香",
            "icon": "plant"
          },
          {
            "label": "大型",
            "icon": "plus"
          }
        ],
        "cols": 3,
        "h": 82
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "收获",
            "to": "G5",
            "kind": "selected"
          },
          {
            "label": "繁育",
            "to": "G7"
          }
        ]
      }
    ],
    "heading": "草莓",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G3",
    "title": "花园 · 生长与照料",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "plant",
        "h": 155,
        "targets": {}
      },
      {
        "type": "progress",
        "label": "草莓 · 12:48",
        "value": 0.64
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "施肥",
            "to": "G3"
          },
          {
            "label": "喷雾",
            "to": "G3"
          },
          {
            "label": "培育",
            "to": "G11"
          }
        ]
      },
      {
        "type": "row",
        "label": "天气",
        "icon": "rainbow",
        "meta": "彩虹 · 32:10",
        "to": "G12"
      }
    ],
    "heading": "草莓",
    "back": "G0",
    "weather": true,
    "space": "garden"
  },
  {
    "id": "G4",
    "title": "花园 · 背包",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "果实",
            "to": "G4",
            "kind": "selected"
          },
          {
            "label": "种子",
            "to": "G1"
          },
          {
            "label": "道具",
            "to": "G13"
          }
        ]
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "草莓",
            "icon": "plant",
            "meta": "金色 × 1",
            "to": "G5"
          },
          {
            "label": "菠萝",
            "icon": "plant",
            "meta": "普通 × 4",
            "to": "G5"
          },
          {
            "label": "蓝莓",
            "icon": "plant",
            "meta": "普通 × 6",
            "to": "G5"
          }
        ],
        "cols": 3,
        "h": 108
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "出售",
            "to": "G5"
          },
          {
            "label": "投喂",
            "to": "G14"
          }
        ]
      }
    ],
    "heading": "背包",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G5",
    "title": "收获 · 出售或投喂",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "plant",
        "h": 150,
        "targets": {}
      },
      {
        "type": "text",
        "value": "草莓 × 1",
        "style": "heading"
      },
      {
        "type": "text",
        "value": "金色 · 1.28 kg",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "出售 ◉ 240",
            "to": "G15",
            "kind": "selected"
          },
          {
            "label": "投喂",
            "to": "G14"
          }
        ]
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "收进背包",
            "to": "G4"
          }
        ]
      }
    ],
    "heading": "收获",
    "back": "G0"
  },
  {
    "id": "G6",
    "title": "花园 · 图鉴",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "植物",
            "to": "G6",
            "kind": "selected"
          },
          {
            "label": "词条",
            "to": "G16"
          }
        ]
      },
      {
        "type": "progress",
        "label": "12 / 36",
        "value": 0.33
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "草莓",
            "icon": "plant",
            "to": "G2"
          },
          {
            "label": "菠萝",
            "icon": "plant",
            "to": "G2"
          },
          {
            "label": "蓝莓",
            "icon": "plant",
            "to": "G2"
          },
          {
            "label": "未发现",
            "icon": "lock"
          },
          {
            "label": "未发现",
            "icon": "lock"
          },
          {
            "label": "未发现",
            "icon": "lock"
          }
        ],
        "cols": 3,
        "h": 108
      }
    ],
    "heading": "图鉴",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G7",
    "title": "花园 · 繁育",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "text",
            "value": "亲本",
            "style": "heading"
          },
          {
            "type": "grid",
            "items": [
              {
                "label": "金色草莓",
                "icon": "plant",
                "meta": "已选择",
                "to": "G7"
              },
              {
                "label": "彩色草莓",
                "icon": "plant",
                "meta": "已选择",
                "to": "G7"
              }
            ],
            "cols": 2,
            "h": 180
          },
          {
            "type": "row",
            "label": "精油",
            "icon": "gift",
            "meta": "× 1",
            "to": "G7",
            "action": "使用"
          }
        ],
        "right": [
          {
            "type": "scene",
            "kind": "plant",
            "h": 200,
            "targets": {}
          },
          {
            "type": "text",
            "value": "草莓 × 草莓",
            "style": "heading"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "开始繁育",
                "to": "G17",
                "kind": "selected"
              },
              {
                "label": "取消",
                "to": "G0"
              }
            ]
          }
        ]
      }
    ],
    "heading": "繁育",
    "back": "G0",
    "close": "G0"
  },
  {
    "id": "G8",
    "title": "种植商店 · 大界面",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "种子",
            "to": "G8",
            "kind": "selected"
          },
          {
            "label": "道具",
            "to": "G9"
          },
          {
            "label": "外观",
            "to": "A0"
          }
        ]
      },
      {
        "type": "text",
        "value": "◉ 8 888",
        "style": "heading"
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "草莓种子",
            "icon": "plant",
            "meta": "◉ 120",
            "to": "G18"
          },
          {
            "label": "菠萝种子",
            "icon": "plant",
            "meta": "◉ 260",
            "to": "G18"
          },
          {
            "label": "蓝莓种子",
            "icon": "plant",
            "meta": "◉ 160",
            "to": "G18"
          },
          {
            "label": "加速肥",
            "icon": "gift",
            "meta": "◉ 80",
            "to": "G18"
          },
          {
            "label": "喷雾",
            "icon": "cloud",
            "meta": "◉ 100",
            "to": "G18"
          },
          {
            "label": "繁育精油",
            "icon": "heart",
            "meta": "◉ 300",
            "to": "G18"
          }
        ],
        "cols": 3,
        "h": 176
      }
    ],
    "heading": "商店",
    "back": "G0",
    "close": "G0"
  },
  {
    "id": "G9",
    "title": "种植商店 · 道具",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "种子",
            "to": "G8"
          },
          {
            "label": "道具",
            "to": "G9",
            "kind": "selected"
          },
          {
            "label": "外观",
            "to": "A0"
          }
        ]
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "加速肥",
            "icon": "gift",
            "meta": "◉ 80",
            "to": "G18"
          },
          {
            "label": "喷雾",
            "icon": "cloud",
            "meta": "◉ 100",
            "to": "G18"
          },
          {
            "label": "繁育精油",
            "icon": "heart",
            "meta": "◉ 300",
            "to": "G18"
          }
        ],
        "cols": 3,
        "h": 200
      }
    ],
    "heading": "商店",
    "back": "G0",
    "close": "G0"
  },
  {
    "id": "G10",
    "title": "花园 · 朋友花园",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "可助育 · 2 株",
        "to": "G19",
        "action": "拜访"
      },
      {
        "type": "row",
        "label": "小林",
        "icon": "pet",
        "meta": "生长中",
        "to": "G19",
        "action": "拜访"
      },
      {
        "type": "row",
        "label": "张起灵",
        "icon": "pet",
        "meta": "可繁育 · 1 株",
        "to": "G19",
        "action": "拜访"
      }
    ],
    "heading": "朋友花园",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G11",
    "title": "花园 · 培育中",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "plant",
        "h": 165,
        "targets": {}
      },
      {
        "type": "progress",
        "label": "00:42",
        "value": 0.7
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "暂停",
            "to": "G3"
          },
          {
            "label": "收起",
            "to": "D0"
          }
        ]
      }
    ],
    "heading": "培育",
    "back": "G0",
    "space": "garden"
  },
  {
    "id": "G12",
    "title": "花园 · 特殊天气",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "map",
        "h": 120,
        "targets": {}
      },
      {
        "type": "row",
        "label": "彩虹",
        "icon": "rainbow",
        "meta": "32:10"
      },
      {
        "type": "row",
        "label": "天气词条",
        "icon": "star",
        "meta": "彩色变异"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "返回花园",
            "to": "G0"
          }
        ]
      }
    ],
    "heading": "天气",
    "back": "G0",
    "weather": true
  },
  {
    "id": "G13",
    "title": "背包 · 道具",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "加速肥",
        "icon": "gift",
        "meta": "× 5",
        "to": "G3",
        "action": "使用"
      },
      {
        "type": "row",
        "label": "喷雾",
        "icon": "cloud",
        "meta": "× 3",
        "to": "G3",
        "action": "使用"
      },
      {
        "type": "row",
        "label": "繁育精油",
        "icon": "heart",
        "meta": "× 1",
        "to": "G7",
        "action": "使用"
      }
    ],
    "heading": "道具",
    "back": "G4",
    "space": "garden"
  },
  {
    "id": "G14",
    "title": "投喂 · 当前角色",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "Lv. 8"
      },
      {
        "type": "scene",
        "kind": "plant",
        "h": 110,
        "targets": {}
      },
      {
        "type": "text",
        "value": "草莓 × 1",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "投喂",
            "to": "G20",
            "kind": "selected"
          },
          {
            "label": "返回",
            "to": "G4"
          }
        ]
      }
    ],
    "heading": "投喂",
    "back": "G4"
  },
  {
    "id": "G15",
    "title": "出售 · 完成",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "reward",
        "h": 145,
        "targets": {}
      },
      {
        "type": "text",
        "value": "◉ +240",
        "style": "heading"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "背包",
            "to": "G4"
          },
          {
            "label": "继续种植",
            "to": "G0"
          }
        ]
      }
    ],
    "heading": "出售",
    "back": "G4"
  },
  {
    "id": "G16",
    "title": "图鉴 · 词条",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "闪亮",
            "icon": "star",
            "to": "G2"
          },
          {
            "label": "蜜香",
            "icon": "plant",
            "to": "G2"
          },
          {
            "label": "彩虹",
            "icon": "rainbow",
            "to": "G2"
          },
          {
            "label": "大型",
            "icon": "plus",
            "to": "G2"
          }
        ],
        "cols": 2,
        "h": 115
      }
    ],
    "heading": "词条",
    "back": "G6",
    "space": "garden"
  },
  {
    "id": "G17",
    "title": "繁育 · 获得种子",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "plant",
            "h": 340,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "草莓种子 × 1",
            "style": "heading"
          },
          {
            "type": "grid",
            "items": [
              {
                "label": "蜜香",
                "icon": "plant"
              },
              {
                "label": "闪亮",
                "icon": "star"
              }
            ],
            "cols": 2,
            "h": 120
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "播种",
                "to": "G1",
                "kind": "selected"
              },
              {
                "label": "收进背包",
                "to": "G4"
              }
            ]
          }
        ]
      }
    ],
    "heading": "繁育结果",
    "back": "G0",
    "close": "G0"
  },
  {
    "id": "G18",
    "title": "商店 · 确认数量",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "plant",
            "h": 320,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "草莓种子",
            "style": "heading"
          },
          {
            "type": "text",
            "value": "◉ 120",
            "style": "body"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "−",
                "to": "G18"
              },
              {
                "label": "1",
                "to": "G18"
              },
              {
                "label": "+",
                "to": "G18"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "购买 ◉ 120",
                "to": "G21",
                "kind": "selected"
              },
              {
                "label": "取消",
                "to": "G8"
              }
            ]
          }
        ]
      }
    ],
    "heading": "购买",
    "back": "G8",
    "close": "G8"
  },
  {
    "id": "G19",
    "title": "朋友花园 · 助育",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "助育",
            "to": "G22",
            "kind": "selected"
          },
          {
            "label": "申请繁育",
            "to": "G23"
          }
        ]
      }
    ],
    "heading": "阿圆的花园",
    "back": "G10",
    "space": "garden"
  },
  {
    "id": "G20",
    "title": "投喂 · 经验反馈",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "pet",
        "h": 150,
        "targets": {}
      },
      {
        "type": "progress",
        "label": "Lv. 8   +120",
        "value": 0.76
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "继续种植",
            "to": "G0"
          },
          {
            "label": "背包",
            "to": "G4"
          }
        ]
      }
    ],
    "heading": "投喂完成",
    "back": "G0"
  },
  {
    "id": "G21",
    "title": "商店 · 购买成功",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "plant",
            "h": 280,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "草莓种子 × 1",
            "style": "heading"
          },
          {
            "type": "text",
            "value": "◉ −120",
            "style": "body"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "去播种",
                "to": "G1",
                "kind": "selected"
              },
              {
                "label": "继续购买",
                "to": "G8"
              }
            ]
          }
        ]
      }
    ],
    "heading": "购买成功",
    "back": "G8",
    "close": "G8"
  },
  {
    "id": "G22",
    "title": "朋友花园 · 已助育",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet"
      },
      {
        "type": "row",
        "label": "助育完成",
        "icon": "check"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "返回",
            "to": "G10"
          }
        ]
      }
    ],
    "heading": "阿圆的花园",
    "back": "G10",
    "space": "garden"
  },
  {
    "id": "G23",
    "title": "朋友花园 · 繁育申请",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet"
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "我的草莓",
            "icon": "plant"
          },
          {
            "label": "阿圆的草莓",
            "icon": "plant"
          }
        ],
        "cols": 2,
        "h": 140
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "发送申请",
            "to": "M6",
            "kind": "selected"
          },
          {
            "label": "取消",
            "to": "G19"
          }
        ]
      }
    ],
    "heading": "繁育申请",
    "back": "G19"
  },
  {
    "id": "H0",
    "title": "我的房间 · 3D 布置",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "小企鹅的房间 · 布置",
    "back": "P1",
    "close": "H4",
    "space": "room"
  },
  {
    "id": "H1",
    "title": "我的房间 · 家具分类",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "小企鹅的房间 · 布置",
    "back": "P1",
    "close": "H4",
    "space": "room"
  },
  {
    "id": "H2",
    "title": "我的房间 · 3D 家具操作",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "布置",
    "back": "H0",
    "close": "H4",
    "space": "room"
  },
  {
    "id": "H3",
    "title": "我的房间 · 完成布置",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "小企鹅的房间",
    "back": "P0",
    "space": "room"
  },
  {
    "id": "H4",
    "title": "我的房间 · 取消摆放",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "未保存",
    "back": "H2",
    "close": "H2",
    "space": "room"
  },
  {
    "id": "H5",
    "title": "装修 · 从其他角色房间收回",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "room",
            "h": 240,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "吴邪的房间",
            "style": "heading"
          },
          {
            "type": "row",
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "已摆放 1"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "收回并使用",
                "to": "H2",
                "kind": "selected"
              },
              {
                "label": "取消",
                "to": "H0"
              }
            ]
          }
        ]
      }
    ],
    "heading": "收回家具",
    "back": "H0",
    "close": "H0"
  },
  {
    "id": "K0",
    "title": "扭蛋 · 2D奖池",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "2D 家具",
            "to": "K0",
            "kind": "selected"
          },
          {
            "label": "3D 家具",
            "to": "K1"
          }
        ]
      },
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "machine",
            "h": 300,
            "targets": {}
          },
          {
            "type": "text",
            "value": "代币 720",
            "style": "heading"
          },
          {
            "type": "progress",
            "label": "稀有以上  6 / 10",
            "value": 0.6
          },
          {
            "type": "progress",
            "label": "史诗  16 / 20",
            "value": 0.8
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "单抽 60",
                "to": "K7"
              },
              {
                "label": "十连 600",
                "to": "E7",
                "kind": "selected"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "grid",
            "items": [
              {
                "label": "月蚀之门",
                "icon": "star",
                "meta": "外观 · 头等奖",
                "to": "K4"
              },
              {
                "label": "步生花",
                "icon": "plant",
                "meta": "外观 · 头等奖",
                "to": "K4"
              },
              {
                "label": "月光玻璃庭院",
                "icon": "home",
                "meta": "高级家具",
                "to": "K4"
              },
              {
                "label": "云朵叠泉",
                "icon": "home",
                "meta": "高级家具",
                "to": "K4"
              },
              {
                "label": "草莓种子 ×3",
                "icon": "plant",
                "to": "K4"
              },
              {
                "label": "初级加速肥 ×3",
                "icon": "gift",
                "to": "K4"
              }
            ],
            "cols": 2,
            "h": 140
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "全部奖品",
                "to": "K4"
              },
              {
                "label": "概率",
                "to": "K5"
              }
            ]
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "P0",
    "close": "P0"
  },
  {
    "id": "K1",
    "title": "扭蛋 · 3D奖池",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "2D 家具",
            "to": "K0"
          },
          {
            "label": "3D 家具",
            "to": "K1",
            "kind": "selected"
          }
        ]
      },
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "machine",
            "h": 300,
            "targets": {}
          },
          {
            "type": "text",
            "value": "代币 720",
            "style": "heading"
          },
          {
            "type": "progress",
            "label": "稀有以上  2 / 10",
            "value": 0.2
          },
          {
            "type": "progress",
            "label": "史诗  2 / 20",
            "value": 0.1
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "单抽 60",
                "to": "K7"
              },
              {
                "label": "十连 600",
                "to": "E7",
                "kind": "selected"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "grid",
            "items": [
              {
                "label": "月蚀之门",
                "icon": "star",
                "meta": "外观 · 头等奖",
                "to": "K4B"
              },
              {
                "label": "步生花",
                "icon": "plant",
                "meta": "外观 · 头等奖",
                "to": "K4B"
              },
              {
                "label": "万圣壁炉",
                "icon": "home",
                "meta": "高级家具",
                "to": "K4B"
              },
              {
                "label": "古堡烛光吊灯",
                "icon": "lamp",
                "meta": "高级家具",
                "to": "K4B"
              },
              {
                "label": "女巫魔药锅",
                "icon": "gift",
                "meta": "高级家具",
                "to": "K4B"
              },
              {
                "label": "南瓜囚灯",
                "icon": "lamp",
                "meta": "家具",
                "to": "K4B"
              }
            ],
            "cols": 2,
            "h": 140
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "全部奖品",
                "to": "K4B"
              },
              {
                "label": "概率",
                "to": "K5"
              }
            ]
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "P0",
    "close": "P0"
  },
  {
    "id": "K2",
    "title": "扭蛋 · 单抽揭晓",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "reward",
            "h": 350,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "月蚀之门",
            "style": "title"
          },
          {
            "type": "text",
            "value": "外观 · 头等奖",
            "style": "heading"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "装备给小企鹅",
                "to": "A2",
                "kind": "selected"
              },
              {
                "label": "收下",
                "to": "K0"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "再抽一次 60",
                "to": "K2"
              }
            ]
          }
        ]
      }
    ],
    "heading": "获得物品",
    "back": "K0",
    "close": "K0"
  },
  {
    "id": "K3",
    "title": "扭蛋 · 十连结果",
    "kind": "large",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "月蚀之门",
            "icon": "star",
            "meta": "头等奖",
            "to": "A2"
          },
          {
            "label": "万圣壁炉",
            "icon": "home",
            "meta": "高级家具",
            "to": "H0"
          },
          {
            "label": "南瓜囚灯",
            "icon": "lamp",
            "to": "H0"
          },
          {
            "label": "女巫书堆",
            "icon": "book",
            "to": "H0"
          },
          {
            "label": "加速肥 ×3",
            "icon": "gift",
            "to": "G13"
          },
          {
            "label": "草莓种子 ×3",
            "icon": "plant",
            "to": "G1"
          },
          {
            "label": "草莓种子 ×3",
            "icon": "plant",
            "to": "G1"
          },
          {
            "label": "郁金香种子 ×2",
            "icon": "plant",
            "to": "G1"
          },
          {
            "label": "蓝莓种子 ×2",
            "icon": "plant",
            "to": "G1"
          },
          {
            "label": "加速肥 ×3",
            "icon": "gift",
            "to": "G13"
          }
        ],
        "cols": 5,
        "h": 154
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "去布置",
            "to": "H0"
          },
          {
            "label": "收下",
            "to": "K1",
            "kind": "selected"
          },
          {
            "label": "再来十连 600",
            "to": "K6"
          }
        ]
      }
    ],
    "heading": "十连结果",
    "back": "K1",
    "close": "K1"
  },
  {
    "id": "K4",
    "title": "扭蛋 · 完整奖池内容",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "2D 家具",
            "to": "K4",
            "kind": "selected"
          },
          {
            "label": "3D 家具",
            "to": "K4B"
          }
        ]
      },
      {
        "type": "grid",
        "cols": 4,
        "h": 120,
        "items": [
          {
            "label": "月蚀之门",
            "icon": "star",
            "meta": "外观 · 头等奖"
          },
          {
            "label": "步生花",
            "icon": "plant",
            "meta": "外观 · 头等奖"
          },
          {
            "label": "月光玻璃庭院",
            "icon": "home",
            "meta": "高级家具"
          },
          {
            "label": "云朵叠泉",
            "icon": "home",
            "meta": "高级家具"
          },
          {
            "label": "花匠置物架",
            "icon": "sofa",
            "meta": "家具"
          },
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "家具"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "家具"
          },
          {
            "label": "苔绒小凳",
            "icon": "sofa",
            "meta": "家具"
          },
          {
            "label": "草莓种子 ×3",
            "icon": "plant"
          },
          {
            "label": "郁金香种子 ×2",
            "icon": "plant"
          },
          {
            "label": "蓝莓种子 ×2",
            "icon": "plant"
          },
          {
            "label": "初级加速肥 ×3",
            "icon": "gift"
          },
          {
            "label": "苹果种子 ×2",
            "icon": "plant"
          },
          {
            "label": "菠萝种子 ×3",
            "icon": "plant"
          },
          {
            "label": "高级加速肥 ×2",
            "icon": "gift"
          }
        ]
      }
    ],
    "heading": "奖池",
    "back": "K0",
    "close": "K0"
  },
  {
    "id": "K5",
    "title": "扭蛋 · 概率与保底",
    "kind": "large",
    "blocks": [
      {
        "type": "text",
        "value": "普通 70%   /   稀有 25%   /   史诗 5%",
        "style": "heading"
      },
      {
        "type": "row",
        "label": "稀有及以上",
        "icon": "star",
        "meta": "10 抽保底"
      },
      {
        "type": "row",
        "label": "史诗",
        "icon": "star",
        "meta": "20 抽保底"
      },
      {
        "type": "row",
        "label": "月蚀之门",
        "icon": "star",
        "meta": "1%"
      },
      {
        "type": "row",
        "label": "步生花",
        "icon": "plant",
        "meta": "2.5%"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "返回",
            "to": "K1"
          }
        ]
      }
    ],
    "heading": "概率",
    "back": "K1",
    "close": "K1"
  },
  {
    "id": "K6",
    "title": "扭蛋 · 余额不足",
    "kind": "large",
    "blocks": [
      {
        "type": "text",
        "value": "代币不足",
        "style": "heading"
      },
      {
        "type": "text",
        "value": "当前 120 / 需要 600",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "单抽 60",
            "to": "K2",
            "kind": "selected"
          },
          {
            "label": "返回",
            "to": "K1"
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "K1",
    "close": "K1"
  },
  {
    "id": "A0",
    "title": "外观 · 直接购买与装备",
    "kind": "large",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "月蚀之门",
            "icon": "star",
            "meta": "◉ 9 000",
            "to": "A1"
          },
          {
            "label": "步生花",
            "icon": "plant",
            "meta": "◉ 4 000",
            "to": "A1"
          }
        ],
        "cols": 2,
        "h": 220
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "我的外观",
            "to": "A2"
          }
        ]
      }
    ],
    "heading": "外观",
    "back": "G8",
    "close": "G8"
  },
  {
    "id": "A1",
    "title": "外观 · 商品详情",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "reward",
            "h": 340,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "步生花",
            "style": "title"
          },
          {
            "type": "text",
            "value": "行走足迹",
            "style": "body"
          },
          {
            "type": "text",
            "value": "◉ 4 000",
            "style": "heading"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "购买并装备",
                "to": "A2",
                "kind": "selected"
              },
              {
                "label": "返回",
                "to": "A0"
              }
            ]
          }
        ]
      }
    ],
    "heading": "步生花",
    "back": "A0",
    "close": "A0"
  },
  {
    "id": "A2",
    "title": "角色 · 外观装备",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 340,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "row",
            "label": "月蚀之门",
            "icon": "star",
            "meta": "入场 · 已装备",
            "to": "A3",
            "action": "卸下"
          },
          {
            "type": "row",
            "label": "步生花",
            "icon": "plant",
            "meta": "行走足迹",
            "to": "A3",
            "action": "装备"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "返回角色",
                "to": "R1"
              }
            ]
          }
        ]
      }
    ],
    "heading": "小企鹅 · 外观",
    "back": "R1",
    "close": "R1"
  },
  {
    "id": "A3",
    "title": "外观 · 转交与装配",
    "kind": "large",
    "blocks": [
      {
        "type": "text",
        "value": "步生花",
        "style": "heading"
      },
      {
        "type": "row",
        "label": "当前归属",
        "icon": "pet",
        "meta": "吴邪"
      },
      {
        "type": "row",
        "label": "装配给",
        "icon": "pet",
        "meta": "小企鹅"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "转交并装备",
            "to": "A2",
            "kind": "selected"
          },
          {
            "label": "取消",
            "to": "A2"
          }
        ]
      }
    ],
    "heading": "更换角色",
    "back": "A2",
    "close": "A2"
  },
  {
    "id": "M0",
    "title": "菜单 · 多人",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "kind": "selected",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "朋友",
        "icon": "users",
        "meta": "2 人在线",
        "to": "M1"
      },
      {
        "type": "row",
        "label": "房间",
        "icon": "home",
        "meta": "未加入",
        "to": "M2"
      },
      {
        "type": "row",
        "label": "本地互动",
        "icon": "heart",
        "meta": null,
        "to": "M4"
      }
    ],
    "heading": "菜单",
    "quickControls": true
  },
  {
    "id": "M1",
    "title": "多人 · 好友列表",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "好友",
            "to": "M1",
            "kind": "selected"
          },
          {
            "label": "申请 2",
            "to": "M6"
          },
          {
            "label": "最近",
            "to": "M7"
          }
        ]
      },
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "在线 · 茶室",
        "to": "M3",
        "action": "加入"
      },
      {
        "type": "row",
        "label": "小林",
        "icon": "pet",
        "meta": "在线",
        "to": "M5",
        "action": "邀请"
      },
      {
        "type": "row",
        "label": "Steam 好友",
        "icon": "users",
        "meta": "已连接",
        "to": "M7"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "添加好友",
            "to": "M8"
          }
        ]
      }
    ],
    "heading": "朋友",
    "back": "M0"
  },
  {
    "id": "M2",
    "title": "多人 · 房间发现",
    "kind": "panel",
    "blocks": [
      {
        "type": "input",
        "label": "",
        "value": "搜索房间"
      },
      {
        "type": "row",
        "label": "茶室",
        "icon": "home",
        "meta": "3 / 8",
        "to": "M3",
        "action": "加入"
      },
      {
        "type": "row",
        "label": "花园",
        "icon": "home",
        "meta": "2 / 8",
        "to": "M3",
        "action": "加入"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "创建房间",
            "to": "M9"
          },
          {
            "label": "邀请码",
            "to": "M8"
          }
        ]
      }
    ],
    "heading": "房间",
    "back": "M0"
  },
  {
    "id": "M3",
    "title": "多人 · 房间内",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "茶室",
        "icon": "home",
        "meta": "3 / 8"
      },
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "在线",
        "to": "M4",
        "action": "互动"
      },
      {
        "type": "row",
        "label": "小林",
        "icon": "pet",
        "meta": "在线",
        "to": "M4",
        "action": "互动"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "聊天",
            "to": "C1",
            "kind": "selected"
          },
          {
            "label": "邀请",
            "to": "M5"
          },
          {
            "label": "离开",
            "to": "M2"
          }
        ]
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "房间",
            "to": "P10"
          },
          {
            "label": "透明桌面",
            "to": "D0"
          }
        ]
      }
    ],
    "heading": "茶室",
    "back": "M0",
    "online": true
  },
  {
    "id": "M4",
    "title": "多人 · 互动选择",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet"
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "摸摸",
            "icon": "heart",
            "to": "M10"
          },
          {
            "label": "喝茶",
            "icon": "gift",
            "to": "M10"
          },
          {
            "label": "聊天",
            "icon": "chat",
            "to": "M10"
          },
          {
            "label": "拥抱",
            "icon": "users",
            "to": "M10"
          },
          {
            "label": "跳舞",
            "icon": "star",
            "to": "M10"
          },
          {
            "label": "合影",
            "icon": "image",
            "to": "M10"
          }
        ],
        "cols": 3,
        "h": 100
      }
    ],
    "heading": "互动",
    "back": "M3",
    "online": true
  },
  {
    "id": "M5",
    "title": "多人 · 邀请朋友",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "小林",
        "icon": "pet",
        "meta": "在线",
        "to": "M10",
        "action": "邀请"
      },
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "已在房间"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "复制邀请码",
            "to": "M3"
          }
        ]
      }
    ],
    "heading": "邀请",
    "back": "M3",
    "online": true
  },
  {
    "id": "M6",
    "title": "多人 · 申请与邀请",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "好友申请",
        "to": "M1",
        "action": "接受"
      },
      {
        "type": "row",
        "label": "茶室",
        "icon": "home",
        "meta": "房间邀请",
        "to": "M3",
        "action": "加入"
      },
      {
        "type": "row",
        "label": "草莓繁育",
        "icon": "plant",
        "meta": "阿圆",
        "to": "G7",
        "action": "查看"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "忽略",
            "to": "M1"
          }
        ]
      }
    ],
    "heading": "申请",
    "back": "M1"
  },
  {
    "id": "M7",
    "title": "多人 · 最近与 Steam",
    "kind": "panel",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "最近见过",
            "to": "M7",
            "kind": "selected"
          },
          {
            "label": "Steam",
            "to": "M7"
          }
        ]
      },
      {
        "type": "row",
        "label": "小林",
        "icon": "pet",
        "meta": "昨天一起聊天",
        "to": "M8",
        "action": "添加"
      },
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet",
        "meta": "在线",
        "to": "M3",
        "action": "加入"
      }
    ],
    "heading": "联系人",
    "back": "M1"
  },
  {
    "id": "M8",
    "title": "多人 · 添加或加入",
    "kind": "panel",
    "blocks": [
      {
        "type": "input",
        "label": "好友 ID / 邀请码",
        "value": "QBOT-0826"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "查找",
            "to": "M6",
            "kind": "selected"
          },
          {
            "label": "取消",
            "to": "M1"
          }
        ]
      }
    ],
    "heading": "添加",
    "back": "M1"
  },
  {
    "id": "M9",
    "title": "多人 · 创建房间",
    "kind": "panel",
    "blocks": [
      {
        "type": "input",
        "label": "房间名",
        "value": "茶室"
      },
      {
        "type": "toggle",
        "label": "公开房间",
        "on": true,
        "to": "M9"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "创建",
            "to": "M3",
            "kind": "selected"
          }
        ]
      }
    ],
    "heading": "创建房间",
    "back": "M2"
  },
  {
    "id": "M10",
    "title": "多人 · 等待回应",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "阿圆",
        "icon": "pet"
      },
      {
        "type": "progress",
        "label": "邀请已发送 · 01:48",
        "value": 0.1
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "取消邀请",
            "to": "M3"
          },
          {
            "label": "收起",
            "to": "D0"
          }
        ]
      }
    ],
    "heading": "等待回应",
    "back": "M3",
    "online": true
  },
  {
    "id": "T0",
    "title": "菜单 · 玩家目标",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "kind": "selected",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "tabs",
        "items": [
          {
            "label": "每日",
            "to": "T0",
            "kind": "selected"
          },
          {
            "label": "长期",
            "to": "T2"
          }
        ]
      },
      {
        "type": "row",
        "label": "收获 3 次",
        "icon": "plant",
        "meta": "3 / 3",
        "to": "T1",
        "action": "领取"
      },
      {
        "type": "row",
        "label": "拜访朋友",
        "icon": "users",
        "meta": "0 / 1",
        "to": "G10",
        "action": "前往"
      },
      {
        "type": "row",
        "label": "完成一次繁育",
        "icon": "heart",
        "meta": "0 / 1",
        "to": "G7",
        "action": "前往"
      }
    ],
    "heading": "任务",
    "quickControls": true
  },
  {
    "id": "T1",
    "title": "玩家目标 · 已领取",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "kind": "selected",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "收获 3 次",
        "icon": "check",
        "meta": "已领取"
      },
      {
        "type": "row",
        "label": "拜访朋友",
        "icon": "users",
        "meta": "0 / 1",
        "to": "G10",
        "action": "前往"
      },
      {
        "type": "row",
        "label": "完成一次繁育",
        "icon": "heart",
        "meta": "0 / 1",
        "to": "G7",
        "action": "前往"
      }
    ],
    "heading": "任务",
    "quickControls": true
  },
  {
    "id": "T2",
    "title": "玩家目标 · 长期",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "kind": "selected",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "tabs",
        "items": [
          {
            "label": "每日",
            "to": "T0"
          },
          {
            "label": "长期",
            "to": "T2",
            "kind": "selected"
          }
        ]
      },
      {
        "type": "row",
        "label": "收集 12 种植物",
        "icon": "book",
        "meta": "8 / 12",
        "to": "G6",
        "action": "查看"
      },
      {
        "type": "row",
        "label": "布置 5 件家具",
        "icon": "home",
        "meta": "3 / 5",
        "to": "H0",
        "action": "前往"
      },
      {
        "type": "row",
        "label": "完成 3 次旅行",
        "icon": "travel",
        "meta": "1 / 3",
        "to": "P3",
        "action": "前往"
      }
    ],
    "heading": "任务",
    "quickControls": true
  },
  {
    "id": "R0",
    "title": "菜单 · 我的角色",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "kind": "selected",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "当前角色",
        "to": "R1",
        "action": "管理"
      },
      {
        "type": "row",
        "label": "吴邪",
        "icon": "pet",
        "meta": null,
        "to": "R2",
        "action": "切换"
      },
      {
        "type": "row",
        "label": "张起灵",
        "icon": "pet",
        "meta": null,
        "to": "R2",
        "action": "切换"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "创建角色",
            "to": "R3",
            "kind": "selected"
          },
          {
            "label": "市场",
            "to": "R11"
          },
          {
            "label": "生成 1",
            "to": "R6"
          }
        ]
      }
    ],
    "heading": "角色",
    "quickControls": true
  },
  {
    "id": "R1",
    "title": "角色 · 资料与入口",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "当前角色"
      },
      {
        "type": "row",
        "label": "资料与人设",
        "icon": "edit",
        "meta": null,
        "to": "R4"
      },
      {
        "type": "row",
        "label": "动作",
        "icon": "play",
        "meta": null,
        "to": "R5"
      },
      {
        "type": "row",
        "label": "外观",
        "icon": "star",
        "meta": null,
        "to": "A2"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "我的房间",
            "to": "P1"
          },
          {
            "label": "生成进度",
            "to": "R6"
          }
        ]
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "导入 / 导出",
            "to": "R10"
          }
        ]
      }
    ],
    "heading": "小企鹅",
    "back": "R0",
    "height": 500
  },
  {
    "id": "R2",
    "title": "切换角色 · 房间跟随",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "吴邪的房间",
    "back": "P0W",
    "actor": "吴邪",
    "space": "room"
  },
  {
    "id": "R3",
    "title": "创建角色 · 上传与类型",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "photo",
            "h": 300,
            "targets": {}
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "上传图片",
                "to": "R3"
              },
              {
                "label": "导入表情包",
                "to": "R10"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "input",
            "label": "名字",
            "value": "小企鹅"
          },
          {
            "type": "input",
            "label": "人设",
            "value": "安静，喜欢种植。",
            "to": null,
            "h": 84
          },
          {
            "type": "tabs",
            "items": [
              {
                "label": "视频",
                "to": "R3",
                "kind": "selected"
              },
              {
                "label": "Spine",
                "to": "R13"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "生成形象",
                "to": "R7",
                "kind": "selected"
              }
            ]
          }
        ]
      }
    ],
    "heading": "创建角色",
    "back": "R0",
    "close": "R0"
  },
  {
    "id": "R4",
    "title": "角色 · 编辑人设",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 340,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "input",
            "label": "名字",
            "value": "小企鹅"
          },
          {
            "type": "input",
            "label": "人设",
            "value": "安静，喜欢种植。",
            "to": null,
            "h": 120
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存",
                "to": "R1",
                "kind": "selected"
              },
              {
                "label": "取消",
                "to": "R1"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "删除角色",
                "to": "E6"
              }
            ]
          }
        ]
      }
    ],
    "heading": "资料与人设",
    "back": "R1",
    "close": "R1"
  },
  {
    "id": "R5",
    "title": "角色 · 动作与联动",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "动作",
            "to": "R5",
            "kind": "selected"
          },
          {
            "label": "场景联动",
            "to": "S2"
          }
        ]
      },
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 330,
            "targets": {}
          },
          {
            "type": "buttons",
            "items": [
              {
                "icon": "play",
                "to": "R5"
              },
              {
                "icon": "pause",
                "to": "R5"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "grid",
            "items": [
              {
                "label": "待机",
                "icon": "pet",
                "to": "R5"
              },
              {
                "label": "喝茶",
                "icon": "gift",
                "to": "R5"
              },
              {
                "label": "工作",
                "icon": "table",
                "to": "R5"
              },
              {
                "label": "挥手",
                "icon": "users",
                "to": "R5"
              }
            ],
            "cols": 2,
            "h": 115
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "新增动作",
                "to": "R14"
              },
              {
                "label": "导入",
                "to": "R10"
              }
            ]
          }
        ]
      }
    ],
    "heading": "小企鹅 · 动作",
    "back": "R1",
    "close": "R1"
  },
  {
    "id": "R6",
    "title": "角色 · 生成任务列表",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet",
        "meta": "动作生成 · 4 / 8",
        "to": "R8",
        "action": "查看"
      },
      {
        "type": "row",
        "label": "新角色",
        "icon": "pet",
        "meta": "形象待确认",
        "to": "R7",
        "action": "确认"
      },
      {
        "type": "row",
        "label": "挥手动作",
        "icon": "play",
        "meta": "失败",
        "to": "R9",
        "action": "重试"
      }
    ],
    "heading": "生成进度",
    "back": "R0"
  },
  {
    "id": "R7",
    "title": "创建角色 · 确认形象",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 410,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "换一个方案",
                "to": "R7"
              },
              {
                "label": "确认形象",
                "to": "R8",
                "kind": "selected"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "修改资料",
                "to": "R3"
              }
            ]
          }
        ]
      }
    ],
    "heading": "确认形象",
    "back": "R3",
    "close": "R6"
  },
  {
    "id": "R8",
    "title": "创建角色 · 后台生成",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 330,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "progress",
            "label": "动作生成 · 4 / 8",
            "value": 0.5
          },
          {
            "type": "row",
            "label": "待机",
            "icon": "check",
            "meta": "完成"
          },
          {
            "type": "row",
            "label": "挥手",
            "icon": "clock",
            "meta": "生成中"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "收起",
                "to": "R6"
              }
            ]
          }
        ]
      }
    ],
    "heading": "生成进度",
    "back": "R6",
    "close": "R6",
    "next": {
      "to": "R12",
      "seconds": 4
    }
  },
  {
    "id": "R9",
    "title": "生成任务 · 失败与重试",
    "kind": "large",
    "blocks": [
      {
        "type": "row",
        "label": "挥手动作",
        "icon": "play",
        "meta": "生成失败"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "重试",
            "to": "R8",
            "kind": "selected"
          },
          {
            "label": "返回角色",
            "to": "R1"
          }
        ]
      }
    ],
    "heading": "生成进度",
    "back": "R6",
    "close": "R6"
  },
  {
    "id": "R10",
    "title": "角色 · 导入与导出",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "text",
            "value": "导入",
            "style": "heading"
          },
          {
            "type": "grid",
            "items": [
              {
                "label": "角色包",
                "icon": "bag",
                "to": "R0"
              },
              {
                "label": "表情包",
                "icon": "image",
                "to": "R5"
              }
            ],
            "cols": 2,
            "h": 170
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "导出",
            "style": "heading"
          },
          {
            "type": "row",
            "label": "小企鹅",
            "icon": "pet"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "导出角色包",
                "to": "R1"
              },
              {
                "label": "导出动作",
                "to": "R5"
              }
            ]
          }
        ]
      }
    ],
    "heading": "导入 / 导出",
    "back": "R1",
    "close": "R1"
  },
  {
    "id": "R11",
    "title": "角色 · 市场",
    "kind": "large",
    "blocks": [
      {
        "type": "input",
        "label": "",
        "value": "搜索角色"
      },
      {
        "type": "grid",
        "items": [
          {
            "label": "小企鹅",
            "icon": "pet",
            "meta": "角色包",
            "to": "R15"
          },
          {
            "label": "小猫",
            "icon": "pet",
            "meta": "表情包",
            "to": "R15"
          },
          {
            "label": "小熊",
            "icon": "pet",
            "meta": "角色包",
            "to": "R15"
          }
        ],
        "cols": 3,
        "h": 240
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "我的发布",
            "to": "R15"
          }
        ]
      }
    ],
    "heading": "角色市场",
    "back": "R0",
    "close": "R0"
  },
  {
    "id": "R12",
    "title": "创建角色 · 完成领取",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 390,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "grid",
            "items": [
              {
                "label": "待机",
                "icon": "play",
                "to": "R12"
              },
              {
                "label": "喝茶",
                "icon": "play",
                "to": "R12"
              },
              {
                "label": "挥手",
                "icon": "play",
                "to": "R12"
              }
            ],
            "cols": 3,
            "h": 110
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "放到桌面",
                "to": "D0",
                "kind": "selected"
              },
              {
                "label": "返回角色",
                "to": "R0"
              }
            ]
          }
        ]
      }
    ],
    "heading": "角色完成",
    "back": "R6",
    "close": "R6"
  },
  {
    "id": "R13",
    "title": "创建角色 · Spine分支",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "photo",
            "h": 300,
            "targets": {}
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "上传图片",
                "to": "R13"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "input",
            "label": "名字",
            "value": "小企鹅"
          },
          {
            "type": "input",
            "label": "人设",
            "value": "安静，喜欢种植。",
            "to": null,
            "h": 84
          },
          {
            "type": "tabs",
            "items": [
              {
                "label": "视频",
                "to": "R3"
              },
              {
                "label": "Spine",
                "to": "R13",
                "kind": "selected"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "生成形象",
                "to": "R7S",
                "kind": "selected"
              }
            ]
          }
        ]
      }
    ],
    "heading": "创建角色",
    "back": "R0",
    "close": "R0"
  },
  {
    "id": "R14",
    "title": "角色 · 新增动作",
    "kind": "large",
    "blocks": [
      {
        "type": "input",
        "label": "动作名",
        "value": "打招呼"
      },
      {
        "type": "input",
        "label": "动作描述",
        "value": "抬起右手挥手。",
        "to": null,
        "h": 90
      },
      {
        "type": "scene",
        "kind": "pet",
        "h": 190,
        "targets": {}
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "生成",
            "to": "R8",
            "kind": "selected"
          },
          {
            "label": "取消",
            "to": "R5"
          }
        ]
      }
    ],
    "heading": "新增动作",
    "back": "R5",
    "close": "R5"
  },
  {
    "id": "R15",
    "title": "角色市场 · 详情",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 340,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "row",
            "label": "作者",
            "icon": "pet",
            "meta": "阿圆"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "下载",
                "to": "R0",
                "kind": "selected"
              },
              {
                "label": "返回",
                "to": "R11"
              }
            ]
          }
        ]
      }
    ],
    "heading": "角色详情",
    "back": "R11",
    "close": "R11"
  },
  {
    "id": "S0",
    "title": "菜单 · 设置与快捷开关",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "kind": "selected",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "显示与声音",
        "icon": "settings",
        "meta": null,
        "to": "S1"
      },
      {
        "type": "row",
        "label": "行为与联动",
        "icon": "play",
        "meta": null,
        "to": "S2"
      },
      {
        "type": "row",
        "label": "隐私与记忆",
        "icon": "lock",
        "meta": null,
        "to": "S3"
      },
      {
        "type": "row",
        "label": "连接与生成",
        "icon": "cloud",
        "meta": null,
        "to": "S4"
      }
    ],
    "heading": "设置",
    "height": 500,
    "quickControls": true
  },
  {
    "id": "S1",
    "title": "设置 · 显示与声音",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "toggle",
            "label": "显示角色名字",
            "on": true,
            "to": "S1"
          },
          {
            "type": "toggle",
            "label": "窗口置顶",
            "on": true,
            "to": "S1"
          },
          {
            "type": "toggle",
            "label": "开机启动",
            "on": false,
            "to": "S1"
          },
          {
            "type": "row",
            "label": "角色大小",
            "icon": "pet",
            "meta": "100%"
          },
          {
            "type": "progress",
            "label": "50%  —  100%  —  200%",
            "value": 0.5
          }
        ],
        "right": [
          {
            "type": "toggle",
            "label": "角色声音",
            "on": true,
            "to": "S6"
          },
          {
            "type": "progress",
            "label": "音量  60%",
            "value": 0.6
          },
          {
            "type": "toggle",
            "label": "减少动态效果",
            "on": false,
            "to": "S1"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存",
                "to": "S0",
                "kind": "selected"
              }
            ]
          }
        ]
      }
    ],
    "heading": "显示与声音",
    "back": "S0",
    "close": "S0",
    "quickControls": true
  },
  {
    "id": "S2",
    "title": "设置 · 行为与联动",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "toggle",
            "label": "自主活动",
            "on": true,
            "to": "S2"
          },
          {
            "type": "toggle",
            "label": "主动聊天",
            "on": true,
            "to": "S2"
          },
          {
            "type": "row",
            "label": "频率",
            "icon": "clock",
            "meta": "低"
          },
          {
            "type": "row",
            "label": "一起工作",
            "icon": "table",
            "meta": "双击角色",
            "to": "D1",
            "action": "开启"
          }
        ],
        "right": [
          {
            "type": "row",
            "label": "听歌",
            "icon": "sound",
            "meta": "摇摆",
            "to": "R5",
            "action": "动作"
          },
          {
            "type": "row",
            "label": "开会",
            "icon": "users",
            "meta": "喝茶",
            "to": "R5",
            "action": "动作"
          },
          {
            "type": "row",
            "label": "AI 工作联动",
            "icon": "cloud",
            "meta": "未连接",
            "to": "S4",
            "action": "设置"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存",
                "to": "S0",
                "kind": "selected"
              }
            ]
          }
        ]
      }
    ],
    "heading": "行为与联动",
    "back": "S0",
    "close": "S0",
    "quickControls": true
  },
  {
    "id": "S3",
    "title": "设置 · 隐私与记忆",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "toggle",
            "label": "前台应用感知",
            "on": false,
            "to": "S3"
          },
          {
            "type": "toggle",
            "label": "屏幕画面感知",
            "on": false,
            "to": "S3"
          },
          {
            "type": "toggle",
            "label": "主动提及记忆",
            "on": true,
            "to": "S3"
          }
        ],
        "right": [
          {
            "type": "row",
            "label": "记忆管理",
            "icon": "book",
            "meta": null,
            "to": "P8"
          },
          {
            "type": "row",
            "label": "聊天记录",
            "icon": "chat",
            "meta": null,
            "to": "C6"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存",
                "to": "S0",
                "kind": "selected"
              }
            ]
          }
        ]
      }
    ],
    "heading": "隐私与记忆",
    "back": "S0",
    "close": "S0",
    "quickControls": true
  },
  {
    "id": "S4",
    "title": "设置 · 连接与生成",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "tabs",
            "items": [
              {
                "label": "云端",
                "to": "S4",
                "kind": "selected"
              },
              {
                "label": "本地",
                "to": "S4"
              }
            ]
          },
          {
            "type": "input",
            "label": "邀请码",
            "value": "已绑定"
          },
          {
            "type": "input",
            "label": "模型服务",
            "value": "默认"
          },
          {
            "type": "input",
            "label": "API Key",
            "value": "••••••••"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "保存",
                "to": "S0",
                "kind": "selected"
              }
            ]
          }
        ],
        "right": [
          {
            "type": "row",
            "label": "Steam",
            "icon": "users",
            "meta": "已连接",
            "to": "M7",
            "action": "好友"
          },
          {
            "type": "row",
            "label": "工作联动",
            "icon": "cloud",
            "meta": "未连接",
            "to": "S4",
            "action": "连接"
          },
          {
            "type": "row",
            "label": "开发者工具",
            "icon": "settings",
            "meta": "关闭",
            "to": "S5",
            "action": "打开"
          }
        ]
      }
    ],
    "heading": "连接与生成",
    "back": "S0",
    "close": "S0",
    "quickControls": true
  },
  {
    "id": "S5",
    "title": "设置 · 开发者工具",
    "kind": "large",
    "blocks": [
      {
        "type": "row",
        "label": "日志",
        "icon": "book",
        "meta": "最近 24 小时",
        "to": "S5",
        "action": "查看"
      },
      {
        "type": "row",
        "label": "行为调试",
        "icon": "play",
        "meta": null,
        "to": "S5",
        "action": "打开"
      },
      {
        "type": "row",
        "label": "提示词",
        "icon": "edit",
        "meta": null,
        "to": "S5",
        "action": "编辑"
      },
      {
        "type": "row",
        "label": "服务状态",
        "icon": "cloud",
        "meta": "已连接"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "关闭开发者模式",
            "to": "S4"
          }
        ]
      }
    ],
    "heading": "开发者工具",
    "back": "S4",
    "close": "S4",
    "quickControls": true
  },
  {
    "id": "S6",
    "title": "设置 · 已静音",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "kind": "selected",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "显示与声音",
        "icon": "settings",
        "meta": null,
        "to": "S1"
      },
      {
        "type": "row",
        "label": "行为与联动",
        "icon": "play",
        "meta": null,
        "to": "S2"
      },
      {
        "type": "row",
        "label": "隐私与记忆",
        "icon": "lock",
        "meta": null,
        "to": "S3"
      },
      {
        "type": "row",
        "label": "连接与生成",
        "icon": "cloud",
        "meta": null,
        "to": "S4"
      }
    ],
    "heading": "设置",
    "quickControls": true,
    "height": 500
  },
  {
    "id": "E0",
    "title": "状态 · 暂无物品",
    "kind": "panel",
    "blocks": [
      {
        "type": "scene",
        "kind": "bag",
        "h": 135,
        "targets": {}
      },
      {
        "type": "text",
        "value": "暂无物品",
        "style": "label"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "去商店",
            "to": "G8"
          },
          {
            "label": "返回花园",
            "to": "G0"
          }
        ]
      }
    ],
    "heading": "背包",
    "back": "G0"
  },
  {
    "id": "E1",
    "title": "状态 · 离线与重连",
    "kind": "panel",
    "blocks": [
      {
        "type": "row",
        "label": "连接已断开",
        "icon": "cloud"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "重连",
            "to": "M3",
            "kind": "selected"
          },
          {
            "label": "返回",
            "to": "M0"
          }
        ]
      }
    ],
    "heading": "多人",
    "back": "M0"
  },
  {
    "id": "E2",
    "title": "状态 · 家具保存失败",
    "kind": "large",
    "blocks": [
      {
        "type": "scene",
        "kind": "room",
        "h": 260,
        "targets": {}
      },
      {
        "type": "text",
        "value": "保存失败",
        "style": "heading"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "重试",
            "to": "H3",
            "kind": "selected"
          },
          {
            "label": "继续布置",
            "to": "H2"
          }
        ]
      }
    ],
    "heading": "布置",
    "back": "H2",
    "close": "H4"
  },
  {
    "id": "E3",
    "title": "状态 · 加载中",
    "kind": "panel",
    "blocks": [
      {
        "type": "progress",
        "label": "加载中",
        "value": 0.35
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "返回",
            "to": "P0"
          }
        ]
      }
    ],
    "heading": "房间",
    "back": "P0",
    "next": {
      "to": "P1",
      "seconds": 2
    }
  },
  {
    "id": "E4",
    "title": "回忆 · 遗忘确认",
    "kind": "phone",
    "blocks": [
      {
        "type": "text",
        "value": "遗忘这条回忆？",
        "style": "heading"
      },
      {
        "type": "text",
        "value": "相关对话与衍生记忆也会清除。",
        "style": "body"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "取消",
            "to": "P9"
          },
          {
            "label": "遗忘",
            "to": "P8",
            "kind": "selected"
          }
        ]
      }
    ],
    "heading": "遗忘",
    "back": "P9"
  },
  {
    "id": "E5",
    "title": "聊天 · 清空确认",
    "kind": "panel",
    "blocks": [
      {
        "type": "text",
        "value": "清空聊天记录？",
        "style": "heading"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "取消",
            "to": "C6"
          },
          {
            "label": "清空",
            "to": "C0",
            "kind": "selected"
          }
        ]
      }
    ],
    "heading": "清空",
    "back": "C6"
  },
  {
    "id": "E6",
    "title": "角色 · 删除确认",
    "kind": "large",
    "blocks": [
      {
        "type": "row",
        "label": "小企鹅",
        "icon": "pet"
      },
      {
        "type": "text",
        "value": "删除这个角色？",
        "style": "heading"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "取消",
            "to": "R4"
          },
          {
            "label": "删除",
            "to": "R0",
            "kind": "selected"
          }
        ]
      }
    ],
    "heading": "删除角色",
    "back": "R4",
    "close": "R4"
  },
  {
    "id": "E7",
    "title": "状态 · 扭蛋请求中",
    "kind": "large",
    "blocks": [
      {
        "type": "scene",
        "kind": "machine",
        "h": 320,
        "targets": {}
      },
      {
        "type": "progress",
        "label": "抽取中",
        "value": 0.45
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "收起",
            "to": "K1"
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "K1",
    "close": "K1",
    "next": {
      "to": "K3",
      "seconds": 2
    }
  },
  {
    "id": "E8",
    "title": "状态 · 扭蛋结果待确认",
    "kind": "large",
    "blocks": [
      {
        "type": "text",
        "value": "结果确认中",
        "style": "heading"
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "查询结果",
            "to": "K3",
            "kind": "selected"
          },
          {
            "label": "返回",
            "to": "K1"
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "K1",
    "close": "K1"
  },
  {
    "id": "M0H",
    "title": "隐藏时 · 菜单与恢复",
    "kind": "panel",
    "blocks": [
      {
        "type": "navigation",
        "items": [
          {
            "label": "多人",
            "to": "M0",
            "kind": "selected",
            "icon": "users"
          },
          {
            "label": "任务",
            "to": "T0",
            "icon": "tasks"
          },
          {
            "label": "角色",
            "to": "R0",
            "icon": "pet"
          },
          {
            "label": "设置",
            "to": "S0",
            "icon": "settings"
          }
        ]
      },
      {
        "type": "row",
        "label": "朋友",
        "icon": "users",
        "meta": "2 人在线",
        "to": "M1"
      },
      {
        "type": "row",
        "label": "房间",
        "icon": "home",
        "meta": "未加入",
        "to": "M2"
      },
      {
        "type": "row",
        "label": "本地互动",
        "icon": "heart",
        "meta": null,
        "to": "M4"
      }
    ],
    "heading": "菜单",
    "quickControls": true
  },
  {
    "id": "P0W",
    "title": "切换角色 · 吴邪手机首页",
    "kind": "phone",
    "blocks": [
      {
        "type": "grid",
        "items": [
          {
            "label": "我的房间",
            "icon": "home",
            "to": "P1"
          },
          {
            "label": "朋友圈",
            "icon": "moments",
            "to": "P2"
          },
          {
            "label": "旅行",
            "icon": "travel",
            "to": "P3"
          },
          {
            "label": "关系",
            "icon": "heart",
            "to": "P6"
          },
          {
            "label": "补给站",
            "icon": "capsule",
            "to": "K1"
          },
          {
            "label": "回忆",
            "icon": "book",
            "to": "P8"
          }
        ],
        "cols": 3,
        "h": 112
      }
    ],
    "heading": "吴邪",
    "actor": "吴邪"
  },
  {
    "id": "H0W",
    "title": "装修 · 吴邪独立房间",
    "kind": "panel",
    "blocks": [
      {
        "type": "grid",
        "cols": 3,
        "h": 110,
        "items": [
          {
            "label": "蕨叶双人椅",
            "icon": "sofa",
            "meta": "× 4"
          },
          {
            "label": "圆木矮桌",
            "icon": "table",
            "meta": "× 4"
          },
          {
            "label": "铃兰落地灯",
            "icon": "lamp",
            "meta": "× 4"
          },
          {
            "label": "陶盆绿植",
            "icon": "plant",
            "meta": "× 5"
          }
        ]
      }
    ],
    "heading": "吴邪的房间 · 布置",
    "back": "R2",
    "close": "R2",
    "actor": "吴邪",
    "space": "room"
  },
  {
    "id": "K7",
    "title": "扭蛋 · 单抽请求中",
    "kind": "large",
    "blocks": [
      {
        "type": "scene",
        "kind": "machine",
        "h": 320,
        "targets": {}
      },
      {
        "type": "progress",
        "label": "抽取中",
        "value": 0.45
      },
      {
        "type": "buttons",
        "items": [
          {
            "label": "收起",
            "to": "K1"
          }
        ]
      }
    ],
    "heading": "补给站",
    "back": "K1",
    "close": "K1",
    "next": {
      "to": "K2",
      "seconds": 2
    }
  },
  {
    "id": "R7S",
    "title": "Spine · 确认形象",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 410,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "换一个方案",
                "to": "R7"
              },
              {
                "label": "确认形象",
                "to": "R8S",
                "kind": "selected"
              }
            ]
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "修改资料",
                "to": "R13"
              }
            ]
          }
        ]
      }
    ],
    "heading": "确认形象",
    "back": "R13",
    "close": "R6"
  },
  {
    "id": "R8S",
    "title": "Spine · 部件与校准",
    "kind": "large",
    "blocks": [
      {
        "type": "columns",
        "left": [
          {
            "type": "scene",
            "kind": "pet",
            "h": 330,
            "targets": {}
          }
        ],
        "right": [
          {
            "type": "text",
            "value": "小企鹅",
            "style": "heading"
          },
          {
            "type": "progress",
            "label": "部件装配 · 2 / 4",
            "value": 0.5
          },
          {
            "type": "row",
            "label": "透明部件",
            "icon": "check",
            "meta": "完成"
          },
          {
            "type": "row",
            "label": "自动校准",
            "icon": "clock",
            "meta": "生成中"
          },
          {
            "type": "buttons",
            "items": [
              {
                "label": "收起",
                "to": "R6"
              }
            ]
          }
        ]
      }
    ],
    "heading": "生成进度",
    "back": "R6",
    "close": "R6",
    "next": {
      "to": "R12",
      "seconds": 4
    }
  },
  {
    "id": "K4B",
    "title": "扭蛋 · 3D完整奖池",
    "kind": "large",
    "blocks": [
      {
        "type": "tabs",
        "items": [
          {
            "label": "2D 家具",
            "to": "K4"
          },
          {
            "label": "3D 家具",
            "to": "K4B",
            "kind": "selected"
          }
        ]
      },
      {
        "type": "grid",
        "cols": 4,
        "h": 120,
        "items": [
          {
            "label": "月蚀之门",
            "icon": "star",
            "meta": "外观 · 头等奖"
          },
          {
            "label": "步生花",
            "icon": "plant",
            "meta": "外观 · 头等奖"
          },
          {
            "label": "万圣壁炉",
            "icon": "home",
            "meta": "高级家具"
          },
          {
            "label": "古堡烛光吊灯",
            "icon": "lamp",
            "meta": "高级家具"
          },
          {
            "label": "女巫魔药锅",
            "icon": "gift",
            "meta": "高级家具"
          },
          {
            "label": "南瓜囚灯",
            "icon": "lamp",
            "meta": "家具"
          },
          {
            "label": "笑脸南瓜堆",
            "icon": "gift",
            "meta": "家具"
          },
          {
            "label": "幽夜烛台",
            "icon": "lamp",
            "meta": "家具"
          },
          {
            "label": "女巫书堆",
            "icon": "book",
            "meta": "家具"
          },
          {
            "label": "草莓种子 ×3",
            "icon": "plant"
          },
          {
            "label": "郁金香种子 ×2",
            "icon": "plant"
          },
          {
            "label": "蓝莓种子 ×2",
            "icon": "plant"
          },
          {
            "label": "初级加速肥 ×3",
            "icon": "gift"
          },
          {
            "label": "苹果种子 ×2",
            "icon": "plant"
          },
          {
            "label": "菠萝种子 ×3",
            "icon": "plant"
          },
          {
            "label": "高级加速肥 ×2",
            "icon": "gift"
          }
        ]
      }
    ],
    "heading": "奖池",
    "back": "K1",
    "close": "K1"
  }
];
window.QBOT_ICONS = {
  "chat": "<path d=\"M4 4h16v12H9l-5 4z\"/><path d=\"M8 9h8M8 12h5\"/>",
  "phone": "<rect x=\"6\" y=\"2\" width=\"12\" height=\"20\" rx=\"3\"/><path d=\"M10 5h4M10 19h4\"/>",
  "plant": "<path d=\"M12 21V11M12 13C4 14 3 7 4 4c7 0 9 4 8 9ZM12 10c0-6 5-8 9-8 1 7-3 10-9 8Z\"/>",
  "menu": "<path d=\"M4 6h16M4 12h16M4 18h16\"/>",
  "home": "<path d=\"m2 11 10-8 10 8M5 10v11h14V10M10 21v-7h4v7\"/>",
  "travel": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15 7-2 6-6 4 3-7z\"/>",
  "moments": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"8\" cy=\"8\" r=\"2\"/><path d=\"m4 18 5-5 4 3 4-6 4 8\"/>",
  "heart": "<path d=\"M12 21 3 12C-2 3 9-1 12 7c3-8 14-4 9 5z\"/>",
  "capsule": "<rect x=\"5\" y=\"2\" width=\"14\" height=\"13\" rx=\"6\"/><path d=\"M5 10h14M5 15v7h14v-7M9 18h6\"/>",
  "bag": "<rect x=\"4\" y=\"7\" width=\"16\" height=\"15\" rx=\"3\"/><path d=\"M8 7V3h8v4M4 13h16M10 13v3h4v-3\"/>",
  "book": "<path d=\"M12 5C6 1 2 3 2 3v17s5-2 10 1c5-3 10-1 10-1V3s-4-2-10 2v16\"/>",
  "shop": "<path d=\"M3 8 5 2h14l2 6M3 8v4h18V8M5 12v10h14V12M9 22v-7h6v7\"/>",
  "users": "<circle cx=\"8\" cy=\"7\" r=\"4\"/><circle cx=\"18\" cy=\"8\" r=\"3\"/><path d=\"M1 22v-4c0-7 14-7 14 0v4M16 15c4-1 7 1 7 5v2\"/>",
  "tasks": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"19\" rx=\"2\"/><path d=\"M8 7h8M8 12l2 2 5-5M8 18h8\"/>",
  "pet": "<path d=\"m5 7-2-5 7 3h4l7-3-2 5c6 10-1 16-7 16S-1 17 5 7Z\"/><path d=\"M7 12v2M17 12v2m-7 3 2 1 2-1\"/>",
  "settings": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"m10 2 4 0 1 4 4 0 2 4-3 3 2 4-3 3-4-2-3 3-4-2v-4l-4-1v-4l4-1V5l4 1z\"/>",
  "close": "<path d=\"m5 5 14 14M19 5 5 19\"/>",
  "back": "<path d=\"m15 4-8 8 8 8\"/>",
  "eye": "<path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "sound": "<path d=\"M3 9h4l5-5v16l-5-5H3zM16 8c4 4 4 4 0 8M19 4c8 8 8 8 0 16\"/>",
  "edit": "<path d=\"m4 16-1 6 6-1L21 9l-5-5zM14 6l5 5\"/>",
  "image": "<rect x=\"2\" y=\"3\" width=\"20\" height=\"18\" rx=\"2\"/><circle cx=\"8\" cy=\"8\" r=\"2\"/><path d=\"m3 19 6-6 4 3 4-6 5 9\"/>",
  "smile": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M7 8v2M17 8v2M7 15c2 4 8 4 10 0\"/>",
  "send": "<path d=\"m2 3 20 9-20 9 4-9zM6 12h16\"/>",
  "coin": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 7h6M9 17h6M12 5v14\"/>",
  "star": "<path d=\"m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z\"/>",
  "sofa": "<path d=\"M4 11V4h16v7M2 10h5v6h10v-6h5v11H2zM5 21v2M19 21v2\"/>",
  "table": "<path d=\"M2 8h20v4H2zM5 12v10M19 12v10\"/>",
  "lamp": "<path d=\"m7 2-4 11h18L17 2ZM12 13v9M6 22h12\"/>",
  "gift": "<path d=\"M2 8h20v5H2zM4 13v9h16v-9M12 8v14M12 8C-2 7 9-7 12 8c0-15 14-4 0 0\"/>",
  "play": "<path d=\"m7 3 14 9-14 9z\"/>",
  "pause": "<path d=\"M7 3v18M17 3v18\"/>",
  "check": "<path d=\"m3 12 6 6L21 5\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 5v7l5 3\"/>",
  "plus": "<path d=\"M12 3v18M3 12h18\"/>",
  "refresh": "<path d=\"M20 7a9 9 0 1 0 1 10M20 2v6h-6\"/>",
  "lock": "<rect x=\"4\" y=\"10\" width=\"16\" height=\"12\" rx=\"2\"/><path d=\"M7 10V7a5 5 0 0 1 10 0v3M12 14v4\"/>",
  "cloud": "<path d=\"M6 19c-8 0-6-12 1-10 0-10 16-10 14 2 6 5 0 10-5 8z\"/>",
  "rainbow": "<path d=\"M2 20a10 10 0 0 1 20 0M6 20a6 6 0 0 1 12 0M10 20a2 2 0 0 1 4 0\"/>",
  "more": "<circle cx=\"5\" cy=\"12\" r=\"1\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/>",
  "arrow": "<path d=\"M3 12h18M15 6l6 6-6 6\"/>"
};

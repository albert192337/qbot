/**
 * 内置规则包（从 JSON 转成 TS 模块：rollup 直接内联进 main bundle，
 * 免去 electron-vite 静态资源复制 + asar 路径探测）。
 * 改规则就改这个文件；条件/模板语义见 shared/rule-types.ts。
 */
import type { BehaviorRule } from '../../shared/rule-types';

export const BUILTIN_RULES: BehaviorRule[] = [
  {
    "id": "late-night-comment",
    "name": "深夜了还不睡",
    "description": "23:00~5:00 之间用户还在操作，桌宠吐槽一句",
    "trigger": [
      "hour_chime",
      "app_switch"
    ],
    "weight": 3,
    "priority": 10,
    "cooldownMs": 1800000,
    "dailyLimit": 3,
    "group": "late-night",
    "interrupting": false,
    "source": "built-in",
    "conditions": [
      {
        "kind": "time_range",
        "from": "23:00",
        "to": "05:00"
      },
      {
        "kind": "since_last_interact_lt",
        "minutes": 10
      },
      {
        "kind": "random_chance",
        "p": 0.4
      }
    ],
    "behavior": {
      "actionIntent": "sleepy",
      "lines": [
        {
          "text": "还不睡呀？",
          "weight": 30,
          "tier": "common"
        },
        {
          "text": "都几点了…",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "你的黑眼圈比我还重了",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "再熬夜头发就要掉光啦",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "我都困得睁不开眼了…你还撑着呢",
          "weight": 5,
          "tier": "epic"
        },
        {
          "text": "明天还要上班呢，快睡快睡",
          "weight": 10,
          "tier": "common"
        }
      ]
    }
  },
  {
    "id": "monday-morning",
    "name": "周一综合症",
    "description": "周一早上 9-11 点，桌宠比你还丧",
    "trigger": [
      "hour_chime",
      "app_switch"
    ],
    "weight": 5,
    "priority": 10,
    "cooldownMs": 3600000,
    "dailyLimit": 2,
    "group": "monday",
    "source": "built-in",
    "conditions": [
      {
        "kind": "monday_feeling"
      },
      {
        "kind": "random_chance",
        "p": 0.5
      }
    ],
    "behavior": {
      "actionIntent": "tired",
      "lines": [
        {
          "text": "周一…又要开始了",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "今天是周一对吧…我不想接受这个事实",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "周末为什么这么快就没了",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "我替你困了",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "来都来了，熬一熬就周五了",
          "weight": 10,
          "tier": "epic"
        }
      ]
    }
  },
  {
    "id": "long-time-no-see",
    "name": "好久不见",
    "description": "用户长时间没碰电脑，回来时桌宠打个招呼",
    "trigger": [
      "app_switch"
    ],
    "weight": 8,
    "priority": 20,
    "cooldownMs": 7200000,
    "dailyLimit": 3,
    "source": "built-in",
    "conditions": [
      {
        "kind": "idle_minutes_ge",
        "minutes": 60
      },
      {
        "kind": "since_last_interact_ge",
        "minutes": 60
      }
    ],
    "behavior": {
      "actionIntent": "wave",
      "lines": [
        {
          "text": "你回来啦！",
          "weight": 30,
          "tier": "common"
        },
        {
          "text": "好久不见～",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "你刚才去哪了",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "我都快睡着了，你终于回来了",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "欢迎回来，工作狂",
          "weight": 5,
          "tier": "epic"
        }
      ],
      "preDelayMs": 800
    }
  },
  {
    "id": "overtime-worry",
    "name": "连续加班",
    "description": "活跃超过 6 小时，桌宠担心你",
    "trigger": [
      "hour_chime"
    ],
    "weight": 4,
    "priority": 10,
    "cooldownMs": 5400000,
    "dailyLimit": 2,
    "group": "overtime",
    "source": "built-in",
    "conditions": [
      {
        "kind": "active_minutes_ge",
        "minutes": 360
      },
      {
        "kind": "not_in_meeting"
      },
      {
        "kind": "music_not_playing"
      },
      {
        "kind": "random_chance",
        "p": 0.3
      }
    ],
    "behavior": {
      "actionIntent": "worried",
      "lines": [
        {
          "text": "歇会儿吧…",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "你已经坐了好久了",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "起来走走呗",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "要不要喝口水",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "我数着，你今天已经工作…数不清多久了",
          "weight": 5,
          "tier": "epic"
        }
      ]
    }
  },
  {
    "id": "agent-sass",
    "name": "Claude 出错时吐槽",
    "description": "Claude Code 连续出错，桌宠在旁边阴阳怪气",
    "trigger": [
      "agent_error"
    ],
    "weight": 6,
    "priority": 30,
    "cooldownMs": 120000,
    "dailyLimit": 10,
    "source": "built-in",
    "conditions": [
      {
        "kind": "agent_consecutive_errors_ge",
        "count": 2
      },
      {
        "kind": "random_chance",
        "p": 0.6
      }
    ],
    "behavior": {
      "actionIntent": "smug",
      "lines": [
        {
          "text": "哟，报错了",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "又错了～",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "它行不行啊",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "换我来肯定不会出这种错（大概）",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "啧，这都能错，我都替它脸红",
          "weight": 5,
          "tier": "epic"
        }
      ],
      "preDelayMs": 1000
    }
  },
  {
    "id": "agent-celebrate",
    "name": "Claude 跑完庆祝",
    "description": "Claude Code 跑完一轮、没报错，一起开心",
    "trigger": [
      "agent_stop"
    ],
    "weight": 7,
    "priority": 30,
    "cooldownMs": 60000,
    "dailyLimit": 30,
    "source": "built-in",
    "conditions": [
      {
        "kind": "agent_consecutive_errors_ge",
        "count": 0
      }
    ],
    "behavior": {
      "actionIntent": "celebrate",
      "lines": [
        {
          "text": "搞定！",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "又干完一个～",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "厉害吧，我说它能行的",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "（鼓掌）",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "下一个！",
          "weight": 10,
          "tier": "common"
        }
      ],
      "preDelayMs": 500
    }
  },
  {
    "id": "meeting-end-relief",
    "name": "会议结束长舒一口气",
    "description": "飞书会议结束时，桌宠替你松一口气",
    "trigger": [
      "meeting_end"
    ],
    "weight": 5,
    "priority": 20,
    "cooldownMs": 600000,
    "dailyLimit": 5,
    "source": "built-in",
    "conditions": [
      {
        "kind": "random_chance",
        "p": 0.7
      }
    ],
    "behavior": {
      "actionIntent": "relieved",
      "lines": [
        {
          "text": "终于结束了…",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "累死我了（虽然我没说话）",
          "weight": 15,
          "tier": "rare"
        },
        {
          "text": "（喘气）",
          "weight": 15,
          "tier": "common"
        },
        {
          "text": "你还好吗",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "下一场几点？别告诉我还有",
          "weight": 5,
          "tier": "epic"
        }
      ],
      "preDelayMs": 1500
    }
  },
  {
    "id": "music-bop",
    "name": "听歌时摇摆",
    "description": "开始播放音乐时，桌宠跟着嗨",
    "trigger": [
      "music_start"
    ],
    "weight": 5,
    "priority": 20,
    "cooldownMs": 1800000,
    "dailyLimit": 10,
    "source": "built-in",
    "conditions": [
      {
        "kind": "music_playing"
      },
      {
        "kind": "since_last_interact_ge",
        "minutes": 1
      }
    ],
    "behavior": {
      "actionIntent": "dance",
      "lines": [
        {
          "text": "这歌好听！",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "（晃）",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "再来一首！",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "你歌品不错嘛",
          "weight": 10,
          "tier": "rare"
        }
      ],
      "preDelayMs": 2000
    }
  },
  {
    "id": "click-response",
    "name": "被戳了回应一下",
    "description": "用户点击桌宠时，随机回一句（替代原来自言自语的 click 触发）",
    "trigger": [
      "pet_click"
    ],
    "weight": 3,
    "priority": 30,
    "cooldownMs": 5000,
    "dailyLimit": 100,
    "source": "built-in",
    "conditions": [
      {
        "kind": "random_chance",
        "p": 0.6
      }
    ],
    "behavior": {
      "actionIntent": "happy",
      "lines": [
        {
          "text": "嗯？",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "干嘛",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "我在呢",
          "weight": 15,
          "tier": "common"
        },
        {
          "text": "戳我干啥",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "别戳了，痒",
          "weight": 5,
          "tier": "epic"
        }
      ],
      "preDelayMs": 300
    }
  },
  {
    "id": "startup-greeting",
    "name": "开机打招呼",
    "description": "桌宠启动时，说一句欢迎",
    "trigger": [
      "startup"
    ],
    "weight": 10,
    "priority": 20,
    "cooldownMs": 3600000,
    "dailyLimit": 1,
    "source": "built-in",
    "conditions": [],
    "behavior": {
      "actionIntent": "wave",
      "lines": [
        {
          "text": "我来啦！",
          "weight": 25,
          "tier": "common"
        },
        {
          "text": "嗨～",
          "weight": 20,
          "tier": "common"
        },
        {
          "text": "又见面啦",
          "weight": 15,
          "tier": "common"
        },
        {
          "text": "今天也要加油哦",
          "weight": 10,
          "tier": "rare"
        },
        {
          "text": "（挥爪子）",
          "weight": 10,
          "tier": "rare"
        }
      ],
      "preDelayMs": 1500
    }
  }
];

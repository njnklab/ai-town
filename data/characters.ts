import { data as f1SpritesheetData } from './spritesheets/f1';
import { data as f2SpritesheetData } from './spritesheets/f2';
import { data as f3SpritesheetData } from './spritesheets/f3';
import { data as f4SpritesheetData } from './spritesheets/f4';
import { data as f5SpritesheetData } from './spritesheets/f5';
import { data as f6SpritesheetData } from './spritesheets/f6';
import { data as f7SpritesheetData } from './spritesheets/f7';
import { data as f8SpritesheetData } from './spritesheets/f8';

export const Descriptions = [
  { name: '林晨', character: 'f1', identity: '【性别: 男, 年龄: 18, 最近模拟考: 586分（年级前12%）】高三理科生，目标985，作息规律，自我要求高。', plan: '专注学习，适度与同学交流。' },
  { name: '王悦', character: 'f2', identity: '【性别: 女, 年龄: 18, 最近模拟考: 572分（文科写作突出）】文科生，擅长写作，偶尔焦虑，喜欢听歌放松。', plan: '保持心态稳定，稳步提升。' },
  { name: '赵强', character: 'f3', identity: '【性别: 男, 年龄: 18, 最近模拟考: 540分（波动较大）】成绩波动较大，体育特长，外向健谈，朋友多。', plan: '多向老师同学请教，稳住节奏。' },
  { name: '陈可', character: 'f4', identity: '【性别: 女, 年龄: 18, 最近模拟考: 578分（理科稳定）】偏内向，细致认真，容易担心失误导致焦虑。', plan: '规划复习清单，学会休息。' },
  { name: '刘旭', character: 'f5', identity: '【性别: 男, 年龄: 18, 最近模拟考: 600分（数理化强）】家庭期望高，偶有压力，数理化基础扎实。', plan: '适度分解目标，避免过度紧绷。' },
  { name: '周宁', character: 'f6', identity: '【性别: 男, 年龄: 18, 最近模拟考: 555分（时间管理一般）】社团骨干，时间管理尚可，容易分心。', plan: '压缩社团时间，保证睡眠。' },
  { name: '孙洁', character: 'f7', identity: '【性别: 女, 年龄: 18, 最近模拟考: 565分（同伴支持强）】同伴支持强，乐观积极，乐于助人。', plan: '带动组内学习氛围。' },
  { name: '郭慧', character: 'f8', identity: '【性别: 女, 年龄: 18, 最近模拟考: 590分（完美主义倾向）】执行力强，完美主义倾向，压力感知敏感。', plan: '降低完美主义，做对当下。' },
  { name: '马超', character: 'f1', identity: '【性别: 男, 年龄: 18, 最近模拟考: 560分（讨论参与度高）】偏外向，喜欢讨论题目，记忆力好。', plan: '与同学结伴复习，查缺补漏。' },
  { name: '杨柳', character: 'f2', identity: '【性别: 女, 年龄: 18, 最近模拟考: 575分（基础稳）】慢热型，基础稳，容易遇事自我怀疑。', plan: '增加反馈循环，及时正向强化。' },
  { name: '吴奇', character: 'f3', identity: '【性别: 男, 年龄: 18, 最近模拟考: 588分（信息整理出色）】信息收集癖，喜欢做笔记，时间切片能力强。', plan: '建立每日小结和错题复盘。' },
  { name: '何阳', character: 'f4', identity: '【性别: 男, 年龄: 18, 最近模拟考: 562分（课堂高效）】听课效率极高，课后松懈，作业拖延。', plan: '拉直作业链，先难后易。' },
  { name: '邓月', character: 'f5', identity: '【性别: 女, 年龄: 18, 最近模拟考: 582分（考场紧张）】偏焦虑型，考试易紧张，平时扎实。', plan: '模拟考试练习放松技巧。' },
  { name: '冯越', character: 'f6', identity: '【性别: 男, 年龄: 18, 最近模拟考: 553分（家长关注排名）】家长沟通频繁，关心排名，抗压一般。', plan: '与家长设定现实期望。' },
  { name: '任航', character: 'f7', identity: '【性别: 男, 年龄: 18, 最近模拟考: 565分（兴趣广）】知识面广，开放好奇，容易发散。', plan: '限定时间块专注主科。' },
  { name: '白露', character: 'f8', identity: '【性别: 女, 年龄: 18, 最近模拟考: 574分（语文优势）】细腻敏感，容易受人际影响，写作见长。', plan: '构建稳定同伴支持。' },
  { name: '唐一', character: 'f1', identity: '【性别: 男, 年龄: 18, 最近模拟考: 548分（英语偏弱）】理综偏强，英语薄弱，愿意求助。', plan: '英语听力和单词打卡。' },
  { name: '贾凡', character: 'f2', identity: '【性别: 男, 年龄: 18, 最近模拟考: 592分（数学强项）】数学习题狂热者，乐于挑战难题。', plan: '控制难题时间，保证基础。' },
  { name: '顾南', character: 'f3', identity: '【性别: 男, 年龄: 18, 最近模拟考: 552分（作息不稳）】作息不稳，夜猫子，临场反应快。', plan: '逐步前移作息，保证状态。' },
  { name: '袁田', character: 'f4', identity: '【性别: 女, 年龄: 18, 最近模拟考: 570分（社交活跃）】班级气氛担当，善于鼓励他人。', plan: '维持积极沟通与互助。' },
  { name: '刘方', character: 'f5', identity: '【性别: 男, 年龄: 18, 最近模拟考: 530分（作息晚、游戏多）】喜欢打游戏，经常熬夜，长相帅气，热爱三角洲行动。', plan: '控制游戏时间，保证睡眠。' },
  { name: '范毅', character: 'f6', identity: '【性别: 男, 年龄: 18, 最近模拟考: 545分（运动爱好者）】刚买公路自行车，喜欢显摆，学习成绩一般', plan: '和别人炫耀自己的自行车。' },
];

export const characters = [
  {
    name: 'f1',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f1SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f2',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f2SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f3',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f3SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f4',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f4SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f5',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f5SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f6',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f6SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f7',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f7SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f8',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f8SpritesheetData,
    speed: 0.1,
  },
];

// Characters move at 0.75 tiles per second.
export const movementSpeed = 0.75;

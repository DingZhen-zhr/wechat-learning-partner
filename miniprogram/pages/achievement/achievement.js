const app = getApp();

Page({
  data: {
    // 图表数据
    studyHours: [0, 0, 0, 0, 0, 0, 0], // 周一到周日的数据
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    
    // 统计数据
    totalHoursThisWeek: 0,
    increaseHours: 0, // 相比上周增加/减少
    continueDays: 0,  // 连续学习天数
    planRate: 0,      // 计划完成率
    subjectDist: '',  // 科目分布文案
    
    // 情感化文案
    summaryText: '加载中...'
  },

  onShow() {
    this.calculateWeeklyData();
  },

  /**
   * 核心计算函数
   */
  calculateWeeklyData() {
    const history = wx.getStorageSync('studyHistory') || [];
    const planList = wx.getStorageSync('planList') || [];
    
    // 1. 获取本周的时间范围
    const now = new Date();
    const todayDay = now.getDay() || 7; // 将周日从0变为7，方便计算
    // 计算本周一 00:00:00 的时间戳
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 - todayDay).getTime();
    // 计算上周一 00:00:00 的时间戳（用于对比）
    const lastWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

    // 2. 初始化数据容器
    let thisWeekData = [0, 0, 0, 0, 0, 0, 0]; // Index 0=周一, 6=周日
    let thisWeekTotalSeconds = 0;
    let lastWeekTotalSeconds = 0;
    let subjectCount = {}; // 用于计算科目分布
    let activeDaysSet = new Set(); // 用于计算本周学习了几天

    // 3. 遍历历史记录进行统计
    history.forEach(record => {
      const recordTime = record.time;
      
      // 统计本周数据
      if (recordTime >= currentWeekStart) {
        const date = new Date(recordTime);
        const dayIndex = (date.getDay() || 7) - 1; // 转为 0-6 对应 周一-周日
        
        thisWeekData[dayIndex] += record.duration; // 累加秒数
        thisWeekTotalSeconds += record.duration;
        
        // 统计科目 (用于分布)
        if(record.subject) {
          subjectCount[record.subject] = (subjectCount[record.subject] || 0) + 1;
        }
        
        // 记录活跃日期 (用于连续天数近似计算)
        activeDaysSet.add(date.getDate());
      }
      
      // 统计上周总数据 (仅用于对比)
      else if (recordTime >= lastWeekStart && recordTime < currentWeekStart) {
        lastWeekTotalSeconds += record.duration;
      }
    });

    // 4. 数据格式化与换算 (秒 -> 小时)
    // map 这里的 item 是秒数，我们保留1位小数的小时数
    const formattedStudyHours = thisWeekData.map(sec => parseFloat((sec / 3600).toFixed(1)));
    
    const totalHours = parseFloat((thisWeekTotalSeconds / 3600).toFixed(1));
    const lastTotalHours = parseFloat((lastWeekTotalSeconds / 3600).toFixed(1));
    const diffHours = (totalHours - lastTotalHours).toFixed(1);

    // 5. 计算计划完成率 (基于 planList)
    const totalPlans = planList.length;
    const donePlans = planList.filter(p => p.status === 'done').length;
    const rate = totalPlans > 0 ? Math.round((donePlans / totalPlans) * 100) : 0;

    // 6. 生成科目分布文案
    let distText = '暂无数据';
    const subjects = Object.keys(subjectCount);
    if (subjects.length > 0) {
      // 找出频率最高的两个科目
      subjects.sort((a, b) => subjectCount[b] - subjectCount[a]);
      const top1 = subjects[0];
      const top1Pct = Math.round((subjectCount[top1] / Object.values(subjectCount).reduce((a,b)=>a+b)) * 100);
      distText = `${top1} ${top1Pct}%`;
      if (subjects[1]) {
        distText += ` ${subjects[1]} ${100 - top1Pct}%`; // 简单处理，实际可更精确
      } else {
        distText = `${top1} 100%`;
      }
    }

    // 7. 生成情感化总结文案
    let summary = '';
    if (totalHours === 0) {
      summary = "新的一周开始啦！万事开头难，去首页添加一个计划开始学习吧～";
    } else {
      const compareText = diffHours >= 0 ? `比上周增加 ${diffHours}` : `比上周减少 ${Math.abs(diffHours)}`;
      summary = `我们这周一起学了 ${totalHours} 小时！${compareText} 小时～继续冲冲冲！`;
    }

    // 8. 更新页面数据
    this.setData({
      studyHours: formattedStudyHours,
      totalHoursThisWeek: totalHours,
      summaryText: summary,
      continueDays: activeDaysSet.size, // 这里简单用本周打卡天数代替连续天数
      planRate: rate,
      subjectDist: distText
    });
  }
})
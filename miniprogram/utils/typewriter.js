/**
 * 打字机效果工具类
 * 用于模拟 AI 逐字回复的效果
 */
class Typewriter {
  constructor(options = {}) {
    this.timer = null;
    this.onUpdate = options.onUpdate || function() {};
    this.onComplete = options.onComplete || function() {};
    this.speed = options.speed || 50; // 默认打字速度 50ms/字
  }

  /**
   * 开始打字
   * @param {string} text - 完整文本
   */
  start(text) {
    if (!text) return;
    
    // 如果已经在打字，先停止
    this.stop();

    let currentIndex = 0;
    const length = text.length;

    // 立即输出第一个字，减少等待感
    this.onUpdate(text.slice(0, 1));
    currentIndex = 1;

    this.timer = setInterval(() => {
      if (currentIndex >= length) {
        this.stop();
        this.onComplete();
        return;
      }

      // 每次截取从头到当前的字符串
      const currentText = text.slice(0, currentIndex + 1);
      this.onUpdate(currentText);
      currentIndex++;
    }, this.speed);
  }

  /**
   * 停止打字
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = Typewriter;

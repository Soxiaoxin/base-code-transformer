/**
 * 异步的forEach
 * 场景是：如果批量处理records，会forEach遍历records，去处理数据，这里面可能包含异步任务
 * asyncForEach 保证这些异步任务都处理完了，才执行他下面的语句
 * 如果forEach里面没有异步任务，可直接用Array.forEach
 */
export const asyncForEach = <T>(array: T[], callback: (item: T) => Promise<void>): Promise<void> => {
  let completedCount = 0; // 计数器，用于跟踪已完成的异步任务数量
  
  return new Promise((resolve) => {
    array.forEach(async (item) => {
      await callback(item);
      completedCount++;

      if (completedCount === array.length) {
        resolve();
      }
    });
  });
};
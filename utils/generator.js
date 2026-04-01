/**
 * 数学练习题生成器核心算法
 * 从 xuexiti_v2.html 完整移植，保持算法逻辑一致
 */

// 已生成题目的集合（用于去重）
const generatedProblems = new Set();

// 难度等级配置（与 xuexiti_v2.html 一致）
// basic: 强制无进借位 | standard: 65%概率有进借位 | challenge: 强制有进借位（不限次数）
const DIFFICULTY_CONFIG = {
  basic: { forceNoCarry: true, carryRate: 0, forceCarry: false },
  standard: { forceNoCarry: false, carryRate: 0.65, forceCarry: false },
  challenge: { forceNoCarry: false, carryRate: 1, forceCarry: true }
};

// 运算类型常量
const OPERATION_TYPES = {
  ADDITION: 'addition',
  SUBTRACTION: 'subtraction',
  MULTIPLICATION: 'multiplication',
  DIVISION: 'division',
  MIXED: 'mixed'
};

// 运算符映射
const OPERATOR_MAP = {
  [OPERATION_TYPES.ADDITION]: '+',
  [OPERATION_TYPES.SUBTRACTION]: '-',
  [OPERATION_TYPES.MULTIPLICATION]: '×',
  [OPERATION_TYPES.DIVISION]: '÷'
};

// 运算中文名映射
const OPERATION_NAME_MAP = {
  [OPERATION_TYPES.ADDITION]: '加法',
  [OPERATION_TYPES.SUBTRACTION]: '减法',
  [OPERATION_TYPES.MULTIPLICATION]: '乘法',
  [OPERATION_TYPES.DIVISION]: '除法',
  [OPERATION_TYPES.MIXED]: '混合运算'
};

// 除法类型常量
const DIVISION_TYPES = {
  NORMAL: 'normal',
  TABLE: 'table',
  TABLE_WITH_REMAINDER: 'tableWithRemainder',
  NORMAL_WITH_REMAINDER: 'normalWithRemainder'
};

// 九九乘法表高进位数对（积≥50 或 涉及多位乘法进位）
const HIGH_CARRY_PAIRS = [
  [6,7],[6,8],[6,9],
  [7,6],[7,7],[7,8],[7,9],
  [8,4],[8,5],[8,6],[8,7],[8,8],[8,9],
  [9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9]
];

// 九九乘法表无进位数对（积<10，含1的行/列，九九表最高优先级）
const NO_CARRY_PAIRS = [
  [1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],
  [2,1],[2,2],[2,3],[2,4],
  [3,1],[3,2],
  [4,1],
  [5,1]
];

/**
 * 生成指定范围内的随机数
 */
function randomBetween(min, max) {
  if (min > max) return max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 计算数字的位数
 */
function getDigitCount(num) {
  return num.toString().length;
}

// ========== 进位/借位检测函数 ==========

/**
 * 计算加法进位次数
 */
function getCarryCount(num1, num2) {
  let carry = 0, carryCount = 0;
  let s1 = num1.toString().padStart(Math.max(num1.toString().length, num2.toString().length), '0');
  let s2 = num2.toString().padStart(s1.length, '0');

  for (let i = s1.length - 1; i >= 0; i--) {
    let sum = parseInt(s1[i]) + parseInt(s2[i]) + carry;
    if (sum >= 10) {
      carry = 1;
      carryCount++;
    } else {
      carry = 0;
    }
  }
  return carryCount;
}

/**
 * 计算减法借位次数
 */
function getBorrowCount(num1, num2) {
  let borrow = 0, borrowCount = 0;
  let s1 = num1.toString().padStart(Math.max(num1.toString().length, num2.toString().length), '0');
  let s2 = num2.toString().padStart(s1.length, '0');

  for (let i = s1.length - 1; i >= 0; i--) {
    let diff = parseInt(s1[i]) - parseInt(s2[i]) - borrow;
    if (diff < 0) {
      borrow = 1;
      borrowCount++;
    } else {
      borrow = 0;
    }
  }
  return borrowCount;
}

/**
 * 计算乘法进位次数
 */
function getMultiplicationCarryCount(num1, num2) {
  if (num1 < 10 && num2 < 10) return 0;
  if (num1 >= 10 && num2 >= 10) return 1;
  if ((num1 >= 10 && num2 >= 5) || (num2 >= 10 && num1 >= 5)) return 1;

  if (num1 < 10 && num2 >= 10) {
    if (num1 * (num2 % 10) >= 10 || Math.floor(num2 / 10) * num1 >= 10) return 1;
  }
  if (num2 < 10 && num1 >= 10) {
    if (num2 * (num1 % 10) >= 10 || Math.floor(num1 / 10) * num2 >= 10) return 1;
  }
  return 0;
}

/**
 * 判断加法是否有进位（兼容旧接口）
 */
function hasCarry(num1, num2) {
  return getCarryCount(num1, num2) > 0;
}

/**
 * 判断减法是否有借位（兼容旧接口）
 */
function hasBorrow(num1, num2) {
  return getBorrowCount(num1, num2) > 0;
}

/**
 * 简单难度评分（用于候选竞争选择）
 * 与 xuexiti_v2.html 的 calculateDifficultySimple 一致
 */
function calculateDifficultySimple(num1, num2, operation) {
  if (operation === OPERATION_TYPES.ADDITION) {
    return hasCarry(num1, num2) ? 50 : 0;
  } else if (operation === OPERATION_TYPES.SUBTRACTION) {
    return hasBorrow(num1, num2) ? 50 : 0;
  } else if (operation === OPERATION_TYPES.MULTIPLICATION) {
    return getMultiplicationCarryCount(num1, num2) > 0 ? 50 : 0;
  } else if (operation === OPERATION_TYPES.DIVISION) {
    return 30;
  }
  return 0;
}

// ========== 题目生成核心函数 ==========

/**
 * 生成加法题目
 * 与 xuexiti_v2.html 的 generateAddition 一致
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {object} difficultyConfig - 难度配置 { forceNoCarry, carryRate }
 */
function generateAddition(min, max, difficultyConfig) {
  const { forceNoCarry, carryRate, forceCarry } = difficultyConfig;
  const wantCarry = Math.random() < carryRate;

  if (forceNoCarry) {
    for (let attempts = 0; attempts < 200; attempts++) {
      const num1 = randomBetween(min, max);
      const num2 = randomBetween(min, max);
      if (!hasCarry(num1, num2)) {
        return { num1, num2, operation: OPERATION_TYPES.ADDITION, operator: '+', result: num1 + num2, hasCarry: false };
      }
    }
  } else if (wantCarry || forceCarry) {
    // 困难模式(forceCarry)：不限循环次数，必须找到有进位的
    const maxAttempts = forceCarry ? 99999 : 200;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const num1 = randomBetween(min, max);
      const num2 = randomBetween(min, max);
      if (hasCarry(num1, num2)) {
        return { num1, num2, operation: OPERATION_TYPES.ADDITION, operator: '+', result: num1 + num2, hasCarry: true };
      }
    }
  }
  // 兜底：困难模式不会走到这里
  const num1 = randomBetween(min, max);
  const num2 = randomBetween(min, max);
  return { num1, num2, operation: OPERATION_TYPES.ADDITION, operator: '+', result: num1 + num2, hasCarry: hasCarry(num1, num2) };
}

/**
 * 生成减法题目
 * 与 xuexiti_v2.html 的 generateSubtraction 一致
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {object} difficultyConfig - 难度配置 { forceNoCarry, carryRate }
 */
function generateSubtraction(min, max, difficultyConfig) {
  const { forceNoCarry, carryRate, forceCarry } = difficultyConfig;
  const wantBorrow = Math.random() < carryRate;

  if (forceNoCarry) {
    for (let attempts = 0; attempts < 200; attempts++) {
      let num1 = randomBetween(min, max);
      let num2 = randomBetween(min, max);
      if (num1 < num2) [num1, num2] = [num2, num1];
      // 确保结果为正整数：num1 > num2 且无借位
      if (num1 > num2 && !hasBorrow(num1, num2)) {
        return { num1, num2, operation: OPERATION_TYPES.SUBTRACTION, operator: '-', result: num1 - num2, hasBorrow: false };
      }
    }
  } else if (wantBorrow || forceCarry) {
    // 困难模式(forceCarry)：不限循环次数，必须找到有借位的
    const maxAttempts = forceCarry ? 99999 : 200;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      let num1 = randomBetween(min, max);
      let num2 = randomBetween(min, max);
      if (num1 < num2) [num1, num2] = [num2, num1];
      // 确保结果为正整数：num1 > num2 且有借位
      if (num1 > num2 && hasBorrow(num1, num2)) {
        return { num1, num2, operation: OPERATION_TYPES.SUBTRACTION, operator: '-', result: num1 - num2, hasBorrow: true };
      }
    }
  }
  // 兜底：困难模式不会走到这里；确保 num1 > num2 使结果为正整数
  let num1 = randomBetween(min, max);
  let num2 = randomBetween(min, max);
  if (num1 <= num2) [num1, num2] = [num2, num1];
  if (num1 === num2) num1 = num2 + 1;
  return { num1, num2, operation: OPERATION_TYPES.SUBTRACTION, operator: '-', result: num1 - num2, hasBorrow: hasBorrow(num1, num2) };
}

/**
 * 生成乘法题目
 * 与 xuexiti_v2.html 的 generateMultiplication 一致
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} useTableOnly - 是否限制九九表
 * @param {object} difficultyConfig - 难度配置 { forceNoCarry, carryRate }
 */
function generateMultiplication(min, max, useTableOnly = false, difficultyConfig) {
  const { forceNoCarry, carryRate, forceCarry } = difficultyConfig;
  const wantCarry = Math.random() < carryRate;

  if (useTableOnly) {
    // 九九表模式：不受进位/借位约束，从完整九九表中随机选取（由后处理统一均匀分布）
    const num1 = randomBetween(1, 9);
    const num2 = randomBetween(1, 9);
    return { num1, num2, operation: OPERATION_TYPES.MULTIPLICATION, operator: '×', result: num1 * num2, hasCarry: false };
  }

  // 普通模式（排除1，避免无意义题目如 1×37）
  const effectiveMin = Math.max(2, min);
  if (forceNoCarry) {
    for (let attempts = 0; attempts < 200; attempts++) {
      const num1 = randomBetween(effectiveMin, max);
      const num2 = randomBetween(effectiveMin, max);
      if (getMultiplicationCarryCount(num1, num2) === 0) {
        return { num1, num2, operation: OPERATION_TYPES.MULTIPLICATION, operator: '×', result: num1 * num2, hasCarry: false };
      }
    }
  } else if (wantCarry || forceCarry) {
    // 困难模式(forceCarry)：不限循环次数，必须找到有进位的
    const maxAttempts = forceCarry ? 99999 : 200;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const num1 = randomBetween(effectiveMin, max);
      const num2 = randomBetween(effectiveMin, max);
      if (getMultiplicationCarryCount(num1, num2) > 0) {
        return { num1, num2, operation: OPERATION_TYPES.MULTIPLICATION, operator: '×', result: num1 * num2, hasCarry: true };
      }
    }
  }
  // 兜底：困难模式不会走到这里
  const num1 = randomBetween(effectiveMin, max);
  const num2 = randomBetween(effectiveMin, max);
  return { num1, num2, operation: OPERATION_TYPES.MULTIPLICATION, operator: '×', result: num1 * num2, hasCarry: getMultiplicationCarryCount(num1, num2) > 0 };
}

/**
 * 生成除法题目
 * 困难模式下，余数除法强制要求减法步骤有借位
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {string} divType - 除法类型
 * @param {boolean} forceCarry - 困难模式：强制借位
 */
function generateDivision(min, max, divType = DIVISION_TYPES.NORMAL, forceCarry = false) {
  // 余数除法中检测减法是否有借位：被除数 - 除数×商，检查是否有借位
  function divisionHasBorrow(dividend, divisor, quotient) {
    return getBorrowCount(dividend, divisor * quotient) > 0;
  }

  if (divType === DIVISION_TYPES.TABLE_WITH_REMAINDER) {
    // 九九表内余数除法
    if (forceCarry) {
      // 困难模式：不限次数，必须找到减法有借位的
      for (let attempts = 0; attempts < 99999; attempts++) {
        const divisor = randomBetween(2, 9);
        const quotient = randomBetween(2, 9);
        const remainder = randomBetween(1, divisor - 1);
        const dividend = divisor * quotient + remainder;
        if (divisionHasBorrow(dividend, divisor, quotient)) {
          return { num1: dividend, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder, isExact: false, hasBorrow: true };
        }
      }
    }
    const divisor = randomBetween(2, 9);
    const quotient = randomBetween(2, 9);
    const remainder = randomBetween(1, divisor - 1);
    const dividend = divisor * quotient + remainder;
    return { num1: dividend, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder, isExact: false };
  }

  if (divType === DIVISION_TYPES.NORMAL_WITH_REMAINDER) {
    // 一般余数除法（不受九九表约束）
    const maxAttempts = forceCarry ? 99999 : 300;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      let maxPossibleDivisor = Math.floor(max / 2);
      if (maxPossibleDivisor < 2) maxPossibleDivisor = 2;
      const divisor = randomBetween(2, maxPossibleDivisor);
      let minQuotient = Math.ceil(min / divisor);
      let maxQuotient = Math.floor(max / divisor);
      if (minQuotient < 2) minQuotient = 2;
      if (maxQuotient >= minQuotient) {
        const quotient = randomBetween(minQuotient, maxQuotient);
        const remainder = randomBetween(1, divisor - 1);
        const dividend = divisor * quotient + remainder;
        if (dividend >= min && dividend <= max) {
          if (forceCarry && !divisionHasBorrow(dividend, divisor, quotient)) continue;
          return { num1: dividend, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder, isExact: false, hasBorrow: divisionHasBorrow(dividend, divisor, quotient) };
        }
      }
    }
    // 保底
    const divisor = randomBetween(2, 9);
    const quotient = randomBetween(2, 9);
    const remainder = randomBetween(1, divisor - 1);
    return { num1: divisor * quotient + remainder, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder, isExact: false };
  }

  if (divType === DIVISION_TYPES.TABLE) {
    // 九九表内除法（精确整除）—— 除法精确除法没有减法步骤，无借位概念
    const divisor = randomBetween(2, 9);
    const quotient = randomBetween(2, 9);
    return { num1: divisor * quotient, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder: 0, isExact: true };
  }

  // 普通除法（精确整除，无借位概念）
  for (let attempts = 0; attempts < 300; attempts++) {
    let maxPossibleDivisor = Math.floor(max / 2);
    if (maxPossibleDivisor < 2) maxPossibleDivisor = 2;
    const divisor = randomBetween(2, maxPossibleDivisor);
    let minQuotient = Math.ceil(min / divisor);
    let maxQuotient = Math.floor(max / divisor);
    if (minQuotient < 2) minQuotient = 2;
    if (maxQuotient >= minQuotient) {
      const quotient = randomBetween(minQuotient, maxQuotient);
      const dividend = divisor * quotient;
      if (dividend >= min && dividend <= max) {
        return { num1: dividend, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder: 0, isExact: true };
      }
    }
  }
  // 保底
  const divisor = randomBetween(2, 9);
  const quotient = randomBetween(2, 9);
  return { num1: divisor * quotient, num2: divisor, operation: OPERATION_TYPES.DIVISION, operator: '÷', result: quotient, remainder: 0, isExact: true };
}

/**
 * 获取当前选中的除法类型（支持多选，随机返回其中一个）
 * 与 xuexiti_v2.html 的 getActiveDivType 一致
 */
function getActiveDivType(selectedDivTypes) {
  if (!selectedDivTypes || selectedDivTypes.length === 0) return DIVISION_TYPES.NORMAL;
  return selectedDivTypes[randomBetween(0, selectedDivTypes.length - 1)];
}

// ========== 混合运算生成 ==========

/**
 * 生成混合运算题目
 * 【最高优先规则】先乘除后加减（标准四则运算优先级）
 * 【约束】除法必须精确整除（无余数）；运算结果必须为正整数（>0，无小数/负数）
 */
function generateMixedOperation(selectedOps, rangeMin, rangeMax, useTableMult = false, divType = DIVISION_TYPES.NORMAL) {
  // 将运算类型名转换为运算符
  const typeToOp = {
    [OPERATION_TYPES.ADDITION]: '+',
    [OPERATION_TYPES.SUBTRACTION]: '-',
    [OPERATION_TYPES.MULTIPLICATION]: '×',
    [OPERATION_TYPES.DIVISION]: '÷'
  };
  const ops = [...selectedOps].map(o => typeToOp[o] || o);
  const maxAttempts = 2000;
  const candidateCount = 5;
  let candidates = [];

  const hasAdd = ops.includes('+');
  const hasSub = ops.includes('-');
  const hasMult = ops.includes('×');
  const hasDiv = ops.includes('÷');
  const opKindCount = ops.length;

  for (let attempt = 0; attempt < maxAttempts && candidates.length < candidateCount; attempt++) {
    let valid = true;

    // === 纯乘除（无加减）：先乘除顺序不影响结果 ===
    if (!hasAdd && !hasSub && hasMult && hasDiv) {
      const n1 = useTableMult ? randomBetween(2, 9) : Math.max(2, randomBetween(rangeMin, rangeMax));
      const n2 = useTableMult ? randomBetween(2, 9) : Math.max(2, randomBetween(rangeMin, rangeMax));
      const product = n1 * n2;
      const divMax = divType === DIVISION_TYPES.TABLE ? 9 : rangeMax;
      let factors = [];
      for (let f = 2; f <= product && f <= divMax; f++) {
        if (product % f === 0) factors.push(f);
      }
      if (factors.length === 0) continue;
      const divisor = factors[randomBetween(0, factors.length - 1)];
      const quotient = product / divisor;
      if (Math.random() < 0.5) {
        const expr = n1 + ' × ' + n2 + ' ÷ ' + divisor + ' =';
        if (quotient > 0) {
          candidates.push({ expression: expr, result: quotient, fingerprint: expr.replace(/\s/g, ''), difficulty: quotient });
        }
      } else {
        let eFactors = [];
        for (let f = 2; f <= product && f <= divMax; f++) {
          if (product % f === 0) eFactors.push(f);
        }
        if (eFactors.length === 0) continue;
        const d = eFactors[randomBetween(0, eFactors.length - 1)];
        const q = product / d;
        const e = useTableMult ? randomBetween(2, 9) : Math.max(2, randomBetween(rangeMin, rangeMax));
        const expr = product + ' ÷ ' + d + ' × ' + e + ' =';
        if (q > 0 && q * e > 0) {
          candidates.push({ expression: expr, result: q * e, fingerprint: expr.replace(/\s/g, ''), difficulty: q * e });
        }
      }
      continue;
    }

    // === 有加减的混合运算 ===
    let numOps, numNums;
    if (opKindCount <= 2) {
      numOps = 2; numNums = 3;
    } else if (opKindCount === 3) {
      numOps = 3; numNums = 4;
    } else {
      numOps = 4; numNums = 5;
    }

    // 随机选取运算符
    let myOps;
    if (numOps === opKindCount) {
      myOps = [...ops].sort(() => Math.random() - 0.5);
    } else {
      myOps = [];
      for (const op of ops) { myOps.push(op); }
      while (myOps.length < numOps) {
        myOps.push(ops[randomBetween(0, ops.length - 1)]);
      }
      myOps = myOps.slice(0, numOps).sort(() => Math.random() - 0.5);
    }

    // === 优化策略：先构造乘除部分（确保整除），再补充加减 ===
    // 统计乘除位置和加减位置
    let mdPositions = []; // myOps 中 × 或 ÷ 的索引
    let asPositions = []; // myOps 中 + 或 - 的索引
    for (let i = 0; i < numOps; i++) {
      if (myOps[i] === '×' || myOps[i] === '÷') {
        mdPositions.push(i);
      } else {
        asPositions.push(i);
      }
    }

    // 先为乘除生成安全的数字
    let nums = new Array(numNums);
    let mdValid = true;

    // 按从左到右处理乘除，确保整除
    for (const pos of mdPositions) {
      if (myOps[pos] === '×') {
        // 乘法：生成两个数字
        let a = (nums[pos] !== undefined) ? nums[pos] : (useTableMult ? randomBetween(2, 9) : randomBetween(rangeMin, rangeMax));
        let b = useTableMult ? randomBetween(2, 9) : randomBetween(rangeMin, rangeMax);
        if (divType === DIVISION_TYPES.TABLE) {
          // 如果右侧是÷，参与÷的数字限制在2~9
          if (pos + 1 < numOps && myOps[pos + 1] === '÷') {
            b = randomBetween(2, 9);
          }
        }
        nums[pos] = a;
        nums[pos + 1] = b;
      } else if (myOps[pos] === '÷') {
        // 除法：先确定被除数（左侧数字），再选一个能整除它的除数
        let dividend;
        if (nums[pos] !== undefined) {
          dividend = nums[pos];
        } else {
          dividend = useTableMult ? randomBetween(2, 9) : randomBetween(rangeMin, rangeMax);
        }
        // 选除数：从 dividend 的因数中选
        let factors = [];
        const divMax = divType === DIVISION_TYPES.TABLE ? 9 : rangeMax;
        for (let f = 2; f <= dividend && f <= divMax; f++) {
          if (dividend % f === 0) factors.push(f);
        }
        if (factors.length === 0) {
          // 如果没有合适的因数，直接跳过这次尝试
          // 修正：让被除数是一个有较多因数的数
          dividend = randomBetween(2, 9) * randomBetween(2, 9);
          factors = [];
          for (let f = 2; f <= dividend && f <= divMax; f++) {
            if (dividend % f === 0) factors.push(f);
          }
          if (factors.length === 0) { mdValid = false; break; }
        }
        const divisor = factors[randomBetween(0, factors.length - 1)];
        nums[pos] = dividend;
        nums[pos + 1] = divisor;
      }
    }

    if (!mdValid) continue;

    // 如果×和÷连续（如 a × b ÷ c），需要确保中间结果合理
    // 检查×后面紧跟÷的情况
    for (let i = 0; i < numOps - 1; i++) {
      if (myOps[i] === '×' && myOps[i + 1] === '÷') {
        // a × b ÷ c：b×c的积需要能被c整除？不对，nums[i]×nums[i+1]÷nums[i+2]
        // 但nums[i+2]已经被÷的逻辑设置了。需要确保(nums[i]*nums[i+1])能被nums[i+2]整除
        let product = nums[i] * nums[i + 1];
        let divisor = nums[i + 2];
        if (divisor === 0 || product % divisor !== 0) {
          // 重新选择nums[i+2]使它能整除
          let newFactors = [];
          const divMax = divType === DIVISION_TYPES.TABLE ? 9 : rangeMax;
          for (let f = 2; f <= product && f <= divMax; f++) {
            if (product % f === 0) newFactors.push(f);
          }
          if (newFactors.length === 0) { mdValid = false; break; }
          nums[i + 2] = newFactors[randomBetween(0, newFactors.length - 1)];
        }
      }
    }

    if (!mdValid) continue;

    // 为没有设置过的数字位置生成随机数（纯加/减运算涉及的数字）
    for (let i = 0; i < numNums; i++) {
      if (nums[i] === undefined) {
        nums[i] = randomBetween(rangeMin, rangeMax);
      }
    }

    // ===【最高优先】先乘除后加减 ===
    // 用数组模拟求值过程，先处理×÷，再处理+-
    let values = [...nums];
    let operators = [...myOps];

    // 第一步：遍历处理所有×÷（从右到左splice安全）
    for (let k = operators.length - 1; k >= 0; k--) {
      if (operators[k] === '×') {
        let v = values[k] * values[k + 1];
        values.splice(k, 2, v);
        operators.splice(k, 1);
      } else if (operators[k] === '÷') {
        let divisor = values[k + 1];
        if (divisor === 0 || values[k] % divisor !== 0) { valid = false; break; }
        let v = values[k] / divisor;
        values.splice(k, 2, v);
        operators.splice(k, 1);
      }
    }
    if (!valid) continue;

    // 第二步：遍历处理所有+-（从左到右，减法中间结果不能为负）
    for (let k = 0; k < operators.length; k++) {
      if (operators[k] === '+') {
        values[k + 1] = values[k] + values[k + 1];
      } else if (operators[k] === '-') {
        values[k + 1] = values[k] - values[k + 1];
        if (values[k + 1] < 0) { valid = false; break; }
      }
    }

    if (!valid) continue;

    // 最终结果 = 数组最后一个元素
    let result = values[values.length - 1];
    if (result <= 0 || !Number.isInteger(result)) continue;

    // 组装表达式
    let expr = nums[0] + '';
    for (let k = 0; k < numOps; k++) {
      expr += ' ' + myOps[k] + ' ' + nums[k + 1];
    }
    expr += ' =';
    candidates.push({ expression: expr, result, fingerprint: expr.replace(/\s/g, ''), difficulty: result });
  }

  // 保底：根据运算符种类数生成对应结构的题目
  if (candidates.length === 0) {
    if (hasMult && hasDiv && !hasAdd && !hasSub) {
      // 纯乘除保底
      const a = randomBetween(rangeMin, rangeMax);
      const expr = a + ' × 2 ÷ 2 =';
      candidates.push({ expression: expr, result: a, fingerprint: expr.replace(/\s/g, ''), difficulty: 0 });
    } else {
      // 有加减的保底：用×1和÷1保证乘除部分安全
      if (opKindCount === 4) {
        // 4种：5数字4运算符，用×1和÷1保证安全
        const a = randomBetween(1, 9);
        const b = randomBetween(1, 9);
        const c = randomBetween(1, Math.min(9, a + b - 1));
        const d = randomBetween(1, 9);
        const result = a + b - c + d;
        if (result > 0) {
          const expr = a + ' + ' + b + ' × 1 - ' + c + ' ÷ 1 + ' + d + ' =';
          candidates.push({ expression: expr, result, fingerprint: expr.replace(/\s/g, ''), difficulty: 0 });
        }
      }
      if (candidates.length === 0 && opKindCount === 3) {
        // 3种：4数字3运算符
        const a = randomBetween(1, 9);
        const b = randomBetween(1, 9);
        const c = randomBetween(1, Math.min(9, a + b - 1));
        const result = a + b * 1 - c;
        if (result > 0) {
          const expr = a + ' + ' + b + ' × 1 - ' + c + ' =';
          candidates.push({ expression: expr, result, fingerprint: expr.replace(/\s/g, ''), difficulty: 0 });
        }
      }
      if (candidates.length === 0) {
        // 2种：3数字2运算符
        const a = randomBetween(rangeMin, rangeMax);
        const b = randomBetween(1, 9);
        const result = a + b * 1;
        const expr = a + ' + ' + b + ' × 1 =';
        candidates.push({ expression: expr, result, fingerprint: expr.replace(/\s/g, ''), difficulty: 0 });
      }
    }
    if (candidates.length === 0) {
      // 最终保底（理论上不会走到）
      const n1 = randomBetween(rangeMin, rangeMax);
      const n2 = randomBetween(rangeMin, rangeMax);
      return { type: OPERATION_TYPES.MIXED, expression: n1 + ' + ' + n2 + ' =', result: n1 + n2, fingerprint: n1 + '+' + n2 + '=', difficulty: 0, format: 'horizontal' };
    }
  }

  const best = candidates[randomBetween(0, candidates.length - 1)];
  return {
    type: OPERATION_TYPES.MIXED,
    expression: best.expression,
    result: best.result,
    fingerprint: best.fingerprint,
    difficulty: best.difficulty,
    format: 'horizontal'
  };
}

// ========== 单题生成（候选竞争+去重） ==========

/**
 * 生成单道题目（候选竞争+去重，与 xuexiti_v2.html 的 generateProblemWithOp 一致）
 */
function generateSingleProblem(type, min, max, difficultyConfig, options = {}) {
  const { useTableMult = false, divType = DIVISION_TYPES.NORMAL, selectedDivTypes = [] } = options;
  const { forceCarry = false } = difficultyConfig;
  const candidateCount = 5;
  const maxAttempts = 100; // 最多尝试100次，确保找到不重复的题
  let candidates = [];

  for (let i = 0; i < maxAttempts && candidates.length < candidateCount; i++) {
    let candidate;

    switch (type) {
      case OPERATION_TYPES.ADDITION:
        candidate = generateAddition(min, max, difficultyConfig);
        break;
      case OPERATION_TYPES.SUBTRACTION:
        candidate = generateSubtraction(min, max, difficultyConfig);
        break;
      case OPERATION_TYPES.MULTIPLICATION:
        candidate = generateMultiplication(min, max, useTableMult, difficultyConfig);
        break;
      case OPERATION_TYPES.DIVISION: {
        const activeDivType = selectedDivTypes.length > 0 ? getActiveDivType(selectedDivTypes) : divType;
        candidate = generateDivision(min, max, activeDivType, forceCarry);
        break;
      }
      default:
        candidate = generateAddition(min, max, difficultyConfig);
    }

    // 简单难度评分
    candidate.difficulty = calculateDifficultySimple(candidate.num1, candidate.num2, type);
    // 指纹（去重用）
    candidate.fingerprint = `${candidate.num1},${candidate.num2},${candidate.operator}`;

    // 只要不在候选列表中重复就加入
    if (!candidates.some(c => c.fingerprint === candidate.fingerprint)) {
      candidates.push(candidate);
    }
  }

  // 按难度从高到低排序
  candidates.sort((a, b) => b.difficulty - a.difficulty);

  // 去重选择（与已生成题目不重复）
  for (const candidate of candidates) {
    if (!generatedProblems.has(candidate.fingerprint)) {
      generatedProblems.add(candidate.fingerprint);
      return candidate;
    }
  }

  // 全部重复则返回第一个（极少发生）
  return candidates[0];
}

// ========== 主生成函数 ==========

/**
 * 生成试卷
 * @param {object} params
 *   - operationType: 'addition'|'subtraction'|...|'mixed'  单一模式
 *   - selectedOps: ['addition','subtraction',...]  多选模式
 *   - selectedMixedOps: ['+','-','×','÷']  混合运算组合
 *   - difficulty: 'basic'|'standard'|'challenge'
 *   - min, max: 计算范围
 *   - count: 总题目数
 *   - perPage: 每页题目数
 *   - useTableMult: 是否表内乘法
 *   - divType: 除法类型
 *   - selectedDivTypes: 除法类型数组（多选）
 *   - format: 'horizontal'|'vertical'
 */
function generateWorksheet(params) {
  const {
    operationType,
    selectedOps = [],
    selectedMixedOps = ['+', '-'],
    difficulty = 'standard',
    min = 10,
    max = 50,
    count = 20,
    perPage = 20,
    useTableMult = false,
    divType = DIVISION_TYPES.NORMAL,
    selectedDivTypes = [],
    format = 'horizontal'
  } = params;

  // 清空去重集合
  generatedProblems.clear();

  const problems = [];

  if (operationType === OPERATION_TYPES.MIXED) {
    // === 混合运算模式 ===
    let attempts = 0;
    while (problems.length < count && attempts < count * 20) {
      const mixed = generateMixedOperation(selectedMixedOps, min, max, useTableMult, divType);
      if (!generatedProblems.has(mixed.fingerprint)) {
        generatedProblems.add(mixed.fingerprint);
        problems.push(mixed);
      }
      attempts++;
    }
  } else if (selectedOps.length > 0) {
    // === 多选模式（与 xuexiti_v2.html 的 generateNormalProblems 一致） ===
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.standard;

    // 计算每种运算的配额：均匀分配 + 随机补余
    const opCount = selectedOps.length;
    const baseCount = Math.floor(count / opCount);
    const remainder = count % opCount;

    let quotas = {};
    selectedOps.forEach(op => { quotas[op] = baseCount; });

    // 剩余题数随机分配
    let shuffledOps = [...selectedOps].sort(() => Math.random() - 0.5);
    for (let i = 0; i < remainder; i++) {
      quotas[shuffledOps[i]]++;
    }

    // 按配额生成各类型题目
    let pageProblems = [];
    for (const op of selectedOps) {
      let targetCount = quotas[op];
      let generatedCount = 0;
      let attempts = 0;
      const maxAttempts = targetCount * 15;

      while (generatedCount < targetCount && attempts < maxAttempts) {
        const problem = generateSingleProblem(op, min, max, difficultyConfig, {
          useTableMult,
          divType,
          selectedDivTypes
        });
        if (problem) {
          pageProblems.push({ ...problem, format });
          generatedCount++;
        }
        attempts++;
      }
    }

    // 打乱顺序（与 xuexiti_v2.html 一致）
    pageProblems.sort(() => Math.random() - 0.5);
    problems.push(...pageProblems);
  } else {
    // === 单一模式 ===
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.standard;
    for (let i = 0; i < count; i++) {
      const problem = generateSingleProblem(operationType, min, max, difficultyConfig, {
        useTableMult,
        divType,
        selectedDivTypes
      });
      problems.push({ ...problem, format });
    }
  }

  // === 表内乘法后处理：均匀分布 + 含1上限（不受进位/借位约束） ===
  if (useTableMult) {
    // 完整九九表池（1~9 × 1~9，共81对）
    const pool = [];
    for (let a = 1; a <= 9; a++) {
      for (let b = 1; b <= 9; b++) {
        pool.push([a, b]);
      }
    }

    // 分离不含1和含1两个子池，分别洗牌
    const noOnePool = pool.filter(p => p[0] !== 1 && p[1] !== 1).sort(() => Math.random() - 0.5);
    const withOnePool = pool.filter(p => p[0] === 1 || p[1] === 1).sort(() => Math.random() - 0.5);

    // 合并池：优先从不含1的池中取，再从含1的池中取（控制含1数量 ≤5%）
    const maxWithOne = Math.max(1, Math.floor(count * 0.05));
    const orderedPool = [...noOnePool]; // 先放全部不含1的
    const withOneCount = Math.min(maxWithOne, withOnePool.length);
    for (let i = 0; i < withOneCount; i++) {
      orderedPool.push(withOnePool[i]);
    }

    // 均匀分布：从合并池洗牌选取，循环复用
    const multIndices = [];
    problems.forEach((p, idx) => {
      if (p.operation === OPERATION_TYPES.MULTIPLICATION || (p.operator === '×' && p.num1 !== undefined)) {
        multIndices.push(idx);
      }
    });

    if (multIndices.length > 0 && orderedPool.length > 0) {
      const finalShuffled = [...orderedPool].sort(() => Math.random() - 0.5);
      multIndices.forEach((idx, i) => {
        const pair = finalShuffled[i % finalShuffled.length];
        problems[idx].num1 = pair[0];
        problems[idx].num2 = pair[1];
        problems[idx].result = pair[0] * pair[1];
        problems[idx].fingerprint = `${pair[0]},${pair[1]},×`;
      });
    }
  }

  // === 表内除法后处理：均匀分布（不受进位/借位约束） ===
  const hasTableDiv = selectedDivTypes.includes(DIVISION_TYPES.TABLE);
  const hasTableDivRemainder = selectedDivTypes.includes(DIVISION_TYPES.TABLE_WITH_REMAINDER);
  const isSingleTableDiv = (divType === DIVISION_TYPES.TABLE || divType === DIVISION_TYPES.TABLE_WITH_REMAINDER) && selectedDivTypes.length === 0;

  if (hasTableDiv || hasTableDivRemainder || isSingleTableDiv) {
    // 准备表内除法池（除数2~9 × 商2~9）
    const divPool = [];
    for (let d = 2; d <= 9; d++) {
      for (let q = 2; q <= 9; q++) {
        divPool.push({ divisor: d, quotient: q });
      }
    }
    const shuffledDivPool = divPool.sort(() => Math.random() - 0.5);

    const divIndices = [];
    problems.forEach((p, idx) => {
      if (p.operation === OPERATION_TYPES.DIVISION || (p.operator === '÷' && p.num2 !== undefined)) {
        // 根据原始题目的 isExact 和 remainder 属性判断是否为表内类型
        const hasRemainder = p.remainder !== undefined && p.remainder > 0;
        if (hasTableDiv && !hasRemainder) {
          divIndices.push(idx);
        } else if (hasTableDivRemainder && hasRemainder) {
          divIndices.push(idx);
        } else if (isSingleTableDiv) {
          divIndices.push(idx);
        }
      }
    });

    if (divIndices.length > 0 && shuffledDivPool.length > 0) {
      divIndices.forEach((idx, i) => {
        const item = shuffledDivPool[i % shuffledDivPool.length];
        const divisor = item.divisor;
        const quotient = item.quotient;
        const originalProblem = problems[idx];

        if (originalProblem.remainder !== undefined && originalProblem.remainder > 0) {
          // 表内余数除法
          const remainder = randomBetween(1, divisor - 1);
          const dividend = divisor * quotient + remainder;
          problems[idx].num1 = dividend;
          problems[idx].num2 = divisor;
          problems[idx].result = quotient;
          problems[idx].remainder = remainder;
          problems[idx].fingerprint = `${dividend},${divisor},÷`;
        } else {
          // 表内精确除法
          const dividend = divisor * quotient;
          problems[idx].num1 = dividend;
          problems[idx].num2 = divisor;
          problems[idx].result = quotient;
          problems[idx].remainder = 0;
          problems[idx].isExact = true;
          problems[idx].fingerprint = `${dividend},${divisor},÷`;
        }
      });
    }
  }

  return problems;
}

/**
 * 清除已生成题目记录（用于重新开始）
 */
function clearGeneratedProblems() {
  generatedProblems.clear();
}

// 导出所有函数和常量
export {
  OPERATION_TYPES,
  OPERATOR_MAP,
  OPERATION_NAME_MAP,
  DIVISION_TYPES,
  DIFFICULTY_CONFIG,
  HIGH_CARRY_PAIRS,
  NO_CARRY_PAIRS,
  randomBetween,
  getDigitCount,
  getCarryCount,
  getBorrowCount,
  getMultiplicationCarryCount,
  hasCarry,
  hasBorrow,
  calculateDifficultySimple,
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateDivision,
  getActiveDivType,
  generateMixedOperation,
  generateSingleProblem,
  generateWorksheet,
  clearGeneratedProblems
};

/**
 * Progress Quest - テンプレート解析ユーティリティ (templateParser.js)
 * 
 * 指定されたテンプレート形式のテキストから目標やタスクを自動抽出し、
 * アプリで扱いやすいデータ構造に変換します。
 * 外部APIやAIを使用せず、純粋なJavaScriptのルールベース解析のみで動作します。
 */

/**
 * 全角数字を半角数字に変換します
 * @param {string} str 
 * @returns {string}
 */
export function toHalfWidth(str) {
  if (!str) return ''
  return str.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  )
}

/**
 * 全体目標（②アウトプット目標、①スキル目標）から制作対象キーワードと単位、目標数を抽出します
 * @param {string} outputGoal 
 * @param {string} skillGoal 
 * @returns {{ subject: string, unit: string, totalCount: number | null }}
 */
export function extractGoalContext(outputGoal = '', skillGoal = '') {
  const combined = toHalfWidth(`${outputGoal} ${skillGoal}`).trim()
  if (!combined) return { subject: '', unit: '', totalCount: null }

  // 目標数字の抽出
  const numMatch = combined.match(/(\d+)/)
  const totalCount = numMatch ? parseInt(numMatch[1], 10) : null

  // 単位候補（枚, 本, 点, 個, ページ, P, 作品, 作, 記事, 件, 体, 曲, 章 など）
  let unit = ''
  const unitMatch = combined.match(/\d+\s*(枚|本|点|個|ページ|P|作品|作|記事|件|体|曲|章)/i)
  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1]
  }

  // 代表的な制作物キーワードの検出
  let subject = ''
  const knownKeywords = [
    '背景イラスト', 'イラスト', '立ち絵', 'キャラクター', 'キャラ',
    '漫画', 'マンガ', 'ネーム', '動画', 'ショート動画', 'アニメーション',
    '3Dモデル', '3D', 'モデリング', 'LP', 'Webサイト', '記事', 'ブログ',
    'ポートフォリオ', '楽曲', 'BGM', 'デザイン', 'UI', 'ロゴ'
  ]

  for (const kw of knownKeywords) {
    if (combined.includes(kw)) {
      subject = kw
      break
    }
  }

  // キーワード一覧にない場合、数字の前の単語を取得
  if (!subject) {
    const cleanCombined = combined.replace(/(完成|達成|制作|投稿|公開|提出)/g, '')
    const beforeMatch = cleanCombined.match(/([^\d\s()（）]+)\s*\d+/)
    if (beforeMatch && beforeMatch[1]) {
      subject = beforeMatch[1].trim()
    }
  }

  return {
    subject,
    unit,
    totalCount
  }
}

/**
 * 「数字の目安」テキストから数値を抽出し、タスクを生成します
 * 
 * @param {string} targetNumberText - 「数字の目安」のテキスト（例: "イラスト3枚", "累計5枚"）
 * @param {number} stageIndex - ステージ番号（0: 1ヶ月目, 1: 2ヶ月目, 2: 3ヶ月目）
 * @param {{ cumulativeCount: number, subject: string, unit: string }} [prevTargetInfo] - 前月までの累計情報
 * @param {{ globalSubject: string, globalUnit: string, globalTotalCount: number | null }} [context] - 全体目標の文脈
 * @returns {{
 *   tasks: Array<{ id: string, name: string, done: boolean }>,
 *   isCumulative: boolean,
 *   cumulativeCount: number,
 *   subject: string,
 *   unit: string,
 *   isAmbiguous: boolean,
 *   status: 'exact' | 'inferred' | 'ambiguous',
 *   statusBadge: string,
 *   statusNotes: string[],
 *   warning?: string
 * }}
 */
export function parseNumberTarget(
  targetNumberText = '',
  stageIndex = 0,
  prevTargetInfo = { cumulativeCount: 0, subject: '', unit: '' },
  context = { globalSubject: '', globalUnit: '', globalTotalCount: null }
) {
  const prevCumulativeCount = prevTargetInfo.cumulativeCount || 0
  const prevSubject = prevTargetInfo.subject || ''
  const prevUnit = prevTargetInfo.unit || ''

  const normalized = toHalfWidth(targetNumberText).trim()
  const statusNotes = []

  if (!normalized) {
    return {
      tasks: [],
      isCumulative: false,
      cumulativeCount: prevCumulativeCount,
      subject: prevSubject || context.globalSubject || '',
      unit: prevUnit || context.globalUnit || '',
      isAmbiguous: true,
      status: 'ambiguous',
      statusBadge: '⚠️ 要確認',
      statusNotes: ['数字の目安が入力されていません。タスクを手動で登録してください。'],
      warning: '数字の目安が入力されていません。確認画面でタスクを設定してください。'
    }
  }

  // 累計の判定（「累計」「合計」というキーワードが含まれるか）
  const isCumulative = /(累計|合計)/.test(normalized)

  // 数字の抽出
  const numberMatches = normalized.match(/\d+/)
  if (!numberMatches) {
    return {
      tasks: [],
      isCumulative,
      cumulativeCount: prevCumulativeCount,
      subject: prevSubject || context.globalSubject || '',
      unit: prevUnit || context.globalUnit || '',
      isAmbiguous: true,
      status: 'ambiguous',
      statusBadge: '⚠️ 要確認',
      statusNotes: [`「${targetNumberText}」から具体的な数字を特定できませんでした。`],
      warning: `「${targetNumberText}」から具体的な数字を特定できませんでした。確認画面でタスクを設定してください。`
    }
  }

  const rawNumber = parseInt(numberMatches[0], 10)

  // 修飾語（累計、合計、約、最低、目標など）を除去して、純粋な対象名と単位を抽出
  const textWithoutModifiers = normalized
    .replace(/(累計|合計|約|最低|目標|以上|程度)/g, '')
    .trim()

  // 数字の前の名詞候補（対象名）
  let subject = ''
  const beforeMatch = textWithoutModifiers.match(/([^\d\s()（）]+)\s*\d+/)
  if (beforeMatch && beforeMatch[1]) {
    subject = beforeMatch[1].trim()
  }

  // 数字の後の単位候補
  let unit = ''
  const afterMatch = textWithoutModifiers.match(/\d+\s*([^\d\s()（）]+)/)
  if (afterMatch && afterMatch[1]) {
    unit = afterMatch[1].trim()
  }

  // 累計指定時の対象・単位一致チェック
  // 累計の対象が前月と同じか判断できない場合、勝手に差分を計算しない（安全設計）
  if (isCumulative && prevCumulativeCount > 0) {
    if (subject && prevSubject && subject !== prevSubject) {
      return {
        tasks: [],
        isCumulative: true,
        cumulativeCount: rawNumber,
        subject,
        unit: unit || prevUnit,
        isAmbiguous: true,
        status: 'ambiguous',
        statusBadge: '⚠️ 要確認',
        statusNotes: [`前月の制作物（${prevSubject}）と今回の対象（${subject}）が異なるため、累計の差分計算を保留しました。`],
        warning: `前月の制作物（${prevSubject}）と今回の対象（${subject}）が異なるため、累計の差分を自動計算できませんでした。確認画面でタスクを設定してください。`
      }
    }

    if (unit && prevUnit && unit !== prevUnit) {
      return {
        tasks: [],
        isCumulative: true,
        cumulativeCount: rawNumber,
        subject: subject || prevSubject,
        unit,
        isAmbiguous: true,
        status: 'ambiguous',
        statusBadge: '⚠️ 要確認',
        statusNotes: [`前月の単位（${prevUnit}）と今回の単位（${unit}）が異なるため、累計の差分計算を保留しました。`],
        warning: `前月の単位（${prevUnit}）と今回の単位（${unit}）が異なるため、累計の差分を自動計算できませんでした。確認画面でタスクを設定してください。`
      }
    }
  }

  // 文脈からの対象名・単位の継承
  let finalSubject = subject
  if (!finalSubject) {
    if (prevSubject) {
      finalSubject = prevSubject
      statusNotes.push(`前月の制作物名「${prevSubject}」を引き継ぎました。`)
    } else if (context.globalSubject) {
      finalSubject = context.globalSubject
      statusNotes.push(`全体の目標から「${context.globalSubject}」を引き継ぎました。`)
    }
  }

  let finalUnit = unit
  if (!finalUnit) {
    if (prevUnit) {
      finalUnit = prevUnit
    } else if (context.globalUnit) {
      finalUnit = context.globalUnit
    }
  }

  // タスク名ベースの決定
  const baseName = finalSubject || (finalUnit ? '制作物' : 'タスク')

  let taskCount = 0
  let cumulativeCount = prevCumulativeCount

  if (isCumulative) {
    // 累計指定の場合：差分を計算
    cumulativeCount = rawNumber
    taskCount = rawNumber - prevCumulativeCount
    statusNotes.push(`累計目標（${rawNumber}）から前月までの累計（${prevCumulativeCount}）を引いた差分（${taskCount}個）を生成しました。`)

    if (taskCount <= 0) {
      return {
        tasks: [],
        isCumulative: true,
        cumulativeCount: rawNumber,
        subject: finalSubject,
        unit: finalUnit,
        isAmbiguous: true,
        status: 'ambiguous',
        statusBadge: '⚠️ 要確認',
        statusNotes: [`累計数(${rawNumber})が前月までの累計(${prevCumulativeCount})以下です。`],
        warning: `累計数(${rawNumber})が前月までの累計(${prevCumulativeCount})以下です。確認画面で数値を調整してください。`
      }
    }
  } else {
    // 単月指定の場合
    taskCount = rawNumber
    cumulativeCount = prevCumulativeCount + taskCount

    // 文脈チェック：もし「累計」とは書かれていないが、最終目標数と今回の数値が一致している場合
    if (context.globalTotalCount && rawNumber === context.globalTotalCount && stageIndex > 0) {
      statusNotes.push(`※ 単月目標（${rawNumber}${finalUnit || '個'}）として生成しました。もし累計目標の場合は確認画面で調整してください。`)
    } else {
      statusNotes.push(`数字の目安から ${taskCount}個 のタスクを自動生成しました。`)
    }
  }

  // 安全ガード: 1ヶ月に生成するタスク数が多すぎる場合（例: "フォロワー100人" など）
  if (taskCount > 20) {
    return {
      tasks: [],
      isCumulative,
      cumulativeCount,
      subject: finalSubject,
      unit: finalUnit,
      isAmbiguous: true,
      status: 'ambiguous',
      statusBadge: '⚠️ 要確認',
      statusNotes: [`数値(${taskCount})が大きすぎるためタスクを自動分割しませんでした。`],
      warning: `数値(${taskCount})が大きすぎるためタスクを自動分割しませんでした。確認画面で調整してください。`
    }
  }

  // 1個ずつタスクを生成（自然なタスク名）
  const tasks = Array.from({ length: taskCount }, (_, i) => {
    const taskNumber = isCumulative
      ? prevCumulativeCount + i + 1
      : i + 1

    const displayName = finalUnit
      ? `${baseName} ${taskNumber}${finalUnit}`
      : `${baseName} ${taskNumber}`

    return {
      id: `task-${stageIndex}-${i}`,
      name: displayName,
      done: false
    }
  })

  const hasInference = Boolean(!subject && (prevSubject || context.globalSubject))

  return {
    tasks,
    isCumulative,
    cumulativeCount,
    subject: finalSubject,
    unit: finalUnit,
    isAmbiguous: false,
    status: hasInference ? 'inferred' : 'exact',
    statusBadge: hasInference ? '⚙ 文脈から補完' : '✔ 自動抽出',
    statusNotes
  }
}

/**
 * 「やること」テキストからタスク配列を生成します
 * 複数行、箇条書き、番号リストに対応し、重複を自動排除します
 * 
 * @param {string} todoText - 「やること」のテキスト
 * @param {number} stageIndex - ステージ番号
 * @returns {{
 *   tasks: Array<{ id: string, name: string, done: boolean }>,
 *   duplicateCount: number
 * }}
 */
export function parseTodoList(todoText = '', stageIndex = 0) {
  if (!todoText || !todoText.trim()) {
    return { tasks: [], duplicateCount: 0 }
  }

  const lines = todoText.split(/\r?\n/)
  const tasks = []
  const seenNames = new Set()
  let duplicateCount = 0

  lines.forEach((line) => {
    // 箇条書き記号・数字・括弧などをきれいに除去
    const cleaned = line
      .replace(/^[\s・\-*•※]+/, '')
      .replace(/^(\d+[.、)）]|[①-⑳]|[(（]\d+[)）])\s*/, '')
      .replace(/^[【[][^】\]]*[】\]]\s*/, '')
      .trim()

    // 空行や「なし」「未定」などのノイズを除外
    if (cleaned && !/^(特になし|なし|未定|未記入|ー|-)$/.test(cleaned)) {
      // 重複タスクの防止
      if (seenNames.has(cleaned)) {
        duplicateCount++
      } else {
        seenNames.add(cleaned)
        tasks.push({
          id: `task-${stageIndex}-${tasks.length}`,
          name: cleaned,
          done: false
        })
      }
    }
  })

  return { tasks, duplicateCount }
}

/**
 * 貼り付けられたテンプレート全文を解析するメイン関数
 * 
 * @param {string} rawText - ユーザーが貼り付けたテンプレート文字列
 * @returns {{
 *   success: boolean,
 *   error: string | null,
 *   data: {
 *     skillGoal: string,
 *     outputGoal: string,
 *     serverGoal: string,
 *     title: string,
 *     deadline: string,
 *     context: { subject: string, unit: string, totalCount: number | null },
 *     stages: Array<{
 *       monthIndex: number,
 *       monthTitle: string,
 *       deadlineText: string,
 *       targetState: string,
 *       targetNumber: string,
 *       todoText: string,
 *       reflection: string,
 *       tasks: Array<{ id: string, name: string, done: boolean }>,
 *       isCumulative: boolean,
 *       isAmbiguous: boolean,
 *       status: 'exact' | 'inferred' | 'ambiguous',
 *       statusBadge: string,
 *       statusNotes: string[],
 *       warning?: string
 *     }>
 *   }
 * }}
 */
export function parseTemplate(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      success: false,
      error: 'テンプレート文章が入力されていません。',
      data: null
    }
  }

  const lines = rawText.split(/\r?\n/)

  let skillGoal = ''
  let outputGoal = ''
  let serverGoal = ''

  // 1ヶ月目〜3ヶ月目のデータ保持用
  const stages = [
    { monthIndex: 0, monthTitle: '1ヶ月目', deadlineText: '', targetState: '', targetNumber: '', todoText: '', reflection: '' },
    { monthIndex: 1, monthTitle: '2ヶ月目', deadlineText: '', targetState: '', targetNumber: '', todoText: '', reflection: '' },
    { monthIndex: 2, monthTitle: '3ヶ月目', deadlineText: '', targetState: '', targetNumber: '', todoText: '', reflection: '' },
  ]

  let currentSection = 'header'
  let currentField = null

  // 1行ずつ解析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── セクション判定 ──
    if (/【\s*[1１]\s*[ヶケかカ]?月目\s*】/i.test(trimmed)) {
      currentSection = 'stage_0'
      currentField = null
      const matchDeadline = trimmed.match(/【.*?】\s*(.*)/)
      if (matchDeadline && matchDeadline[1]) {
        stages[0].deadlineText = matchDeadline[1].trim()
      }
      continue
    }

    if (/【\s*[2２]\s*[ヶケかカ]?月目\s*】/i.test(trimmed)) {
      currentSection = 'stage_1'
      currentField = null
      const matchDeadline = trimmed.match(/【.*?】\s*(.*)/)
      if (matchDeadline && matchDeadline[1]) {
        stages[1].deadlineText = matchDeadline[1].trim()
      }
      continue
    }

    if (/【\s*[3３]\s*[ヶケかカ]?月目\s*】/i.test(trimmed)) {
      currentSection = 'stage_2'
      currentField = null
      const matchDeadline = trimmed.match(/【.*?】\s*(.*)/)
      if (matchDeadline && matchDeadline[1]) {
        stages[2].deadlineText = matchDeadline[1].trim()
      }
      continue
    }

    // ── ヘッダー部分（①〜③）の抽出 ──
    if (currentSection === 'header') {
      const match1 = trimmed.match(/^[①1][.\s、・]?\s*伸ばしたいスキル[^\n：:]*[：:]?\s*(.*)/)
      if (match1) {
        skillGoal = match1[1] || ''
        currentField = 'skillGoal'
        continue
      }

      const match2 = trimmed.match(/^[②2][.\s、・]?\s*3[ヶケかカ]?月後のアウトプット目標[^\n：:]*[：:]?\s*(.*)/)
      if (match2) {
        outputGoal = match2[1] || ''
        currentField = 'outputGoal'
        continue
      }

      const match3 = trimmed.match(/^[③3][.\s、・]?\s*制作サーバーでの実績目標[^\n：:]*[：:]?\s*(.*)/)
      if (match3) {
        serverGoal = match3[1] || ''
        currentField = 'serverGoal'
        continue
      }

      // 複数行にわたる入力の結合
      if (currentField === 'skillGoal' && !/^[②2]/.test(trimmed) && !trimmed.startsWith('━━━━')) {
        if (trimmed) skillGoal += (skillGoal ? '\n' : '') + trimmed
      } else if (currentField === 'outputGoal' && !/^[③3]/.test(trimmed) && !trimmed.startsWith('━━━━')) {
        if (trimmed) outputGoal += (outputGoal ? '\n' : '') + trimmed
      } else if (currentField === 'serverGoal' && !trimmed.startsWith('━━━━') && !trimmed.startsWith('【')) {
        if (trimmed) serverGoal += (serverGoal ? '\n' : '') + trimmed
      }
      continue
    }

    // ── 各月の項目抽出 ──
    const stageIdx = currentSection === 'stage_0' ? 0 : currentSection === 'stage_1' ? 1 : 2
    const currentStage = stages[stageIdx]

    const stateMatch = trimmed.match(/^[・\-*]?\s*この時点でなりたい状態[：:]?\s*(.*)/)
    if (stateMatch) {
      currentStage.targetState = stateMatch[1] || ''
      currentField = 'targetState'
      continue
    }

    const numberMatch = trimmed.match(/^[・\-*]?\s*数字の目安[：:]?\s*(.*)/)
    if (numberMatch) {
      currentStage.targetNumber = numberMatch[1] || ''
      currentField = 'targetNumber'
      continue
    }

    const todoMatch = trimmed.match(/^[・\-*]?\s*やること[：:]?\s*(.*)/)
    if (todoMatch) {
      currentStage.todoText = todoMatch[1] || ''
      currentField = 'todoText'
      continue
    }

    const reflectionMatch = trimmed.match(/^[・\-*]?\s*振り返り[^\n：:]*[：:]?\s*(.*)/)
    if (reflectionMatch) {
      currentStage.reflection = reflectionMatch[1] || ''
      currentField = 'reflection'
      continue
    }

    // 複数行項目の追記
    if (currentField && trimmed) {
      if (currentStage[currentField]) {
        currentStage[currentField] += '\n' + trimmed
      } else {
        currentStage[currentField] = trimmed
      }
    }
  }

  // ── 全体目標からのコンテキスト抽出（文脈判断） ──
  const goalContext = extractGoalContext(outputGoal, skillGoal)
  const context = {
    globalSubject: goalContext.subject,
    globalUnit: goalContext.unit,
    globalTotalCount: goalContext.totalCount
  }

  // ── タスクの生成ロジック ──
  let prevTargetInfo = { cumulativeCount: 0, subject: '', unit: '' }

  const processedStages = stages.map((stage, idx) => {
    const hasTodo = Boolean(stage.todoText && stage.todoText.trim())

    if (hasTodo) {
      // 「やること」が記入されていればその内容を優先（重複排除付き）
      const todoResult = parseTodoList(stage.todoText, idx)
      const statusNotes = ['「やること」の記入内容からタスクを登録しました。']
      if (todoResult.duplicateCount > 0) {
        statusNotes.push(`重複したタスクを ${todoResult.duplicateCount}件 除外しました。`)
      }

      return {
        ...stage,
        tasks: todoResult.tasks,
        isCumulative: false,
        isAmbiguous: todoResult.tasks.length === 0,
        status: todoResult.tasks.length === 0 ? 'ambiguous' : 'exact',
        statusBadge: todoResult.tasks.length === 0 ? '⚠️ 要確認' : '✔ 自動抽出',
        statusNotes,
        warning: todoResult.tasks.length === 0 ? 'やることの内容からタスクを抽出できませんでした。' : undefined
      }
    } else {
      // 空欄なら「数字の目安」から生成（前月情報＋全体目標コンテキストを活用）
      const result = parseNumberTarget(stage.targetNumber, idx, prevTargetInfo, context)
      prevTargetInfo = {
        cumulativeCount: result.cumulativeCount,
        subject: result.subject,
        unit: result.unit
      }

      return {
        ...stage,
        tasks: result.tasks,
        isCumulative: result.isCumulative,
        isAmbiguous: result.isAmbiguous,
        status: result.status,
        statusBadge: result.statusBadge,
        statusNotes: result.statusNotes,
        warning: result.warning
      }
    }
  })

  // タイトルの自動決定
  const autoTitle = outputGoal.trim() || skillGoal.trim() || '3ヶ月目標'
  const finalDeadline = stages[2]?.deadlineText || ''

  return {
    success: true,
    error: null,
    data: {
      title: autoTitle,
      skillGoal: skillGoal.trim(),
      outputGoal: outputGoal.trim(),
      serverGoal: serverGoal.trim(),
      deadline: finalDeadline,
      context: goalContext,
      stages: processedStages
    }
  }
}

/**
 * 解析結果を ProgressApp の登録用データに変換します
 * 
 * @param {ReturnType<typeof parseTemplate>['data']} parsedData 
 * @returns {{
 *   goal: object,
 *   tasks: Record<number, Array<{ id: string, name: string, done: boolean }>>,
 *   reflections: Record<number, string>
 * }}
 */
export function convertToProgressAppData(parsedData) {
  if (!parsedData) return null

  const goal = {
    title: parsedData.title,
    type: 'template',
    skillGoal: parsedData.skillGoal,
    outputGoal: parsedData.outputGoal,
    serverGoal: parsedData.serverGoal, // 表示名はUIと画像で「BCC本サーバーへの活動報告目標」に変更
    deliverableCount: 3,
    deliverableNames: ['【1ヶ月目】', '【2ヶ月目】', '【3ヶ月目】'],
    deadline: parsedData.deadline,
    description: parsedData.outputGoal,
    stages: parsedData.stages.map((s) => ({
      monthIndex: s.monthIndex,
      periodText: s.deadlineText,
      targetState: s.targetState,
      targetNumber: s.targetNumber,
      todoText: s.todoText
    }))
  }

  const tasks = {}
  const reflections = {}

  parsedData.stages.forEach((stage, idx) => {
    tasks[idx] = stage.tasks || []
    reflections[idx] = stage.reflection || ''
  })

  return {
    goal,
    tasks,
    reflections
  }
}

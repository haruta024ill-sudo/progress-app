import { useState, useEffect, useRef } from 'react'
import { toPng } from 'html-to-image'
import { parseTemplate, convertToProgressAppData } from './utils/templateParser'
import './App.css'

const DEFAULT_TEMPLATE_TEXT = `① 伸ばしたいスキル・分野or達成したいこと：


② 3ヶ月後のアウトプット目標（数字で）：


③ 制作サーバーでの実績目標：
月1回のVC参加と作品投稿

━━━━ 1ヶ月ごとの段階 ━━━━

【1ヶ月目】〜 　月　日
・この時点でなりたい状態：
・数字の目安：
・やること：
・振り返り（月1回のVCで記入）：

【2ヶ月目】〜 　月　日
・この時点でなりたい状態：
・数字の目安：
・やること：
・振り返り（月1回のVCで記入）：

【3ヶ月目】〜 　月　日
・この時点でなりたい状態：
・数字の目安：
・やること：
・振り返り（月1回のVCで記入）：`

const THEMES = [
  { id: 'mint', name: 'ミントグリーン', icon: '🌿', color: '#10b981', desc: '自然と冒険の標準カラー' },
  { id: 'sky', name: 'スカイブルー', icon: '🌊', color: '#0284c7', desc: '爽快な空とクリスタル' },
  { id: 'lavender', name: 'ラベンダー', icon: '🔮', color: '#7c3aed', desc: '幻想的な魔法と知性' },
  { id: 'pink', name: 'サクラピンク', icon: '🌸', color: '#db2777', desc: '明るく可愛いポップカラー' },
  { id: 'orange', name: 'サンセットオレンジ', icon: '🍊', color: '#ea580c', desc: '元気で活発な太陽の光' },
]

const GUIDE_STEPS = [
  {
    step: 1,
    badge: '基本コンセプト',
    title: 'アプリの目的と基本的な使い方',
    summary: '目標を小さなタスクに分解し、階段を一段ずつ登るようにクリアしていく冒険型進捗管理アプリです。',
    points: [
      '目標を達成するまでの道のりを「階段」として可視化します。',
      'タスクを完了するたびに階段が前進し、現在地がリアルタイムに分かります。',
      'すべてのタスクを達成して、右端の「🏁 GOAL」を目指しましょう！',
    ],
    type: 'visual-concept',
  },
  {
    step: 2,
    badge: '手動で作成',
    title: '目標の登録方法（通常作成）',
    summary: '制作物の数（例：イラスト3枚）や期限を自由に指定して目標を新規作成できます。',
    points: [
      '画面の「目標を作成」ボタンをクリックすると入力画面が開きます。',
      '「目標タイトル」「制作物の数（1〜20個）」「期限」「メモ」を入力します。',
      '登録すると、月や制作物ごとの進捗タブが自動生成されます。',
    ],
    type: 'visual-create',
  },
  {
    step: 3,
    badge: 'ワンクリック登録',
    title: 'テンプレート貼り付けによる登録（AI自動解析）',
    summary: 'Discord等で配られる目標テンプレートをそのまま貼り付けるだけで、AIが自動解析して登録します。',
    points: [
      '「📋 テンプレートから目標を登録」をクリックして文章を貼り付けます。',
      'AIが「伸ばしたいスキル」「1〜3ヶ月目の目標」「期限」「タスク」を自動抽出します。',
      '登録前にプレビュー階段や各月のタスクを自由に確認・修正できます。',
    ],
    type: 'visual-template',
  },
  {
    step: 4,
    badge: 'タスク管理',
    title: 'タスクの追加・完了チェック',
    summary: '月ごとのタブを切り替えて、日々のタスクを追加・チェックしていきましょう。',
    points: [
      '上のタブ（例：【1ヶ月目】）をクリックして対象の月を切り替えます。',
      'タスク名の左のチェックボックスを押すと「完了」になります。',
      '入力欄に文字を入れて「＋ 追加」を押せば、新しいタスクをいつでも追加できます。',
    ],
    type: 'visual-task',
  },
  {
    step: 5,
    badge: '進捗の把握',
    title: '階段グラフと達成率の見方',
    summary: 'タスクの達成状況に応じて階段が登っていきます。横スクロールで全体の流れを確認できます。',
    points: [
      '完了したタスク：鮮やかなテーマカラーの階段になります（✓マーク）。',
      '現在地：今挑戦しているタスクは「★」マークでピョンピョン跳ねて教えてくれます。',
      'タスク数が多い場合も、階段グラフを左右にスワイプ・スクロールして確認できます。',
    ],
    type: 'visual-stairs',
  },
  {
    step: 6,
    badge: '月1回の振り返り',
    title: '振り返りの記入方法',
    summary: '毎月の活動の終わりやVCのタイミングで、学んだことや成果をメモとして記録できます。',
    points: [
      '画面下の「振り返りメモ」に、その月で良かった点や次回への課題を記入します。',
      '入力した内容は自動で保存され、次回アプリを開いたときにも残ります。',
    ],
    type: 'visual-reflection',
  },
  {
    step: 7,
    badge: '成果の共有',
    title: 'PNG画像の保存とDiscordへの共有',
    summary: 'ワンクリックで、すべての階段と進捗率が入った綺麗なレポート画像をダウンロードできます。',
    points: [
      '右上の「📷 画像を保存」ボタンを押すだけ！',
      '横スクロールすることなく、全段数が綺麗に並んだ高画質PNG画像が保存されます。',
      '保存した画像をDiscordの制作サーバーやSNSに投稿して、仲間に進捗を報告しましょう！',
    ],
    type: 'visual-export',
  },
  {
    step: 8,
    badge: 'カスタマイズ',
    title: '名前とテーマカラーの設定',
    summary: '活動名（ニックネーム）や5色のテーマカラーを自由に選んで、自分好みのデザインにできます。',
    points: [
      'ヘッダーの「⚙️ 設定」をクリックします。',
      'ユーザー名（Discordの活動名など）を入力すると、画面や保存画像に名前が入ります。',
      '5色（ミント、スカイ、ラベンダー、ピンク、オレンジ）から好きなカラーを選べます。',
    ],
    type: 'visual-settings',
  },
  {
    step: 9,
    badge: '安全なデータ管理',
    title: 'データの保存場所とバックアップ',
    summary: 'データはお使いの端末（ブラウザ）に安全に保存されます。他人のデータと混ざる心配はありません。',
    points: [
      '会員登録やログインは不要で、完全無料でご利用いただけます。',
      'データはお使いの端末のブラウザ（localStorage）にのみ保存され、外部に勝手に送信されません。',
      '「⚙️ 設定」内の「📥 バックアップを保存」でファイルを書き出し、「📤 復元」でいつでも読み込めます。',
    ],
    type: 'visual-backup',
  },
]

function renderGuideIllustration(type) {
  switch (type) {
    case 'visual-concept':
      return (
        <div className="mini-diagram concept-diagram">
          <div className="mini-stair-group">
            <div className="mini-stair s1 filled">✓ 一歩目</div>
            <div className="mini-stair s2 current">★ 現在地</div>
            <div className="mini-stair s3 future">○ ゴール目前</div>
            <div className="mini-goal">🏁 GOAL</div>
          </div>
          <span className="diagram-caption">タスクを達成するたびに階段を登っていく！</span>
        </div>
      )
    case 'visual-create':
      return (
        <div className="mini-diagram form-diagram">
          <div className="mini-form-preview">
            <div className="mini-input-line">
              <span className="mini-label">目標タイトル:</span>
              <span className="mini-val">背景イラストを3枚完成</span>
            </div>
            <div className="mini-input-row">
              <div className="mini-input-chip">制作物: <strong>3個</strong></div>
              <div className="mini-input-chip">期限: <strong>2026/12/31</strong></div>
            </div>
          </div>
          <span className="diagram-caption">自分のペースに合わせて自由に登録可能</span>
        </div>
      )
    case 'visual-template':
      return (
        <div className="mini-diagram flow-diagram">
          <div className="flow-step">
            <span className="flow-icon">📝</span>
            <span className="flow-text">テンプレ貼付</span>
          </div>
          <span className="flow-arrow">➔</span>
          <div className="flow-step highlight">
            <span className="flow-icon">🤖</span>
            <span className="flow-text">AI自動解析</span>
          </div>
          <span className="flow-arrow">➔</span>
          <div className="flow-step">
            <span className="flow-icon">👁️</span>
            <span className="flow-text">プレビュー確認</span>
          </div>
          <span className="diagram-caption">文脈からタスクや目標を賢く補完・整理！</span>
        </div>
      )
    case 'visual-task':
      return (
        <div className="mini-diagram task-diagram">
          <div className="mini-tab-bar">
            <span className="mini-tab active">【1ヶ月目】</span>
            <span className="mini-tab">【2ヶ月目】</span>
            <span className="mini-tab">【3ヶ月目】</span>
          </div>
          <div className="mini-checklist">
            <div className="mini-check-item checked">
              <span className="mini-checkbox">☑</span>
              <span className="mini-task-text done">パース本を1章読む</span>
            </div>
            <div className="mini-check-item">
              <span className="mini-checkbox">☐</span>
              <span className="mini-task-text">構図ラフを3パターン作成</span>
            </div>
          </div>
          <span className="diagram-caption">チェックを入れると階段の現在地が進む</span>
        </div>
      )
    case 'visual-stairs':
      return (
        <div className="mini-diagram stairs-diagram">
          <div className="mini-scroll-bar-hint">👈 横スクロール対応（スマホでも安心） 👉</div>
          <div className="mini-stair-row">
            <div className="mini-block filled">1. 資料集め</div>
            <div className="mini-block filled">2. 下描き</div>
            <div className="mini-block active">3. 線画 ★</div>
            <div className="mini-block">4. 着彩</div>
            <div className="mini-block">5. 仕上げ</div>
          </div>
          <span className="diagram-caption">タスクが増えても階段幅は崩れず綺麗に表示</span>
        </div>
      )
    case 'visual-reflection':
      return (
        <div className="mini-diagram note-diagram">
          <div className="mini-note-box">
            <div className="mini-note-header">
              <span>💭 【1ヶ月目】の振り返り</span>
            </div>
            <div className="mini-note-body">
              「パース定規の基本操作に慣れた。来月は背景の着彩に集中する！」
            </div>
          </div>
          <span className="diagram-caption">月1回の振り返りをいつでも見返せる</span>
        </div>
      )
    case 'visual-export':
      return (
        <div className="mini-diagram export-diagram">
          <div className="mini-export-btn">📷 画像を保存</div>
          <span className="flow-arrow">➔</span>
          <div className="mini-export-card-preview">
            <span className="mini-card-title">✦ 冒険の進捗レポート.png</span>
            <span className="mini-card-sub">全段数ワイド展開 ＆ 余白たっぷり</span>
          </div>
          <span className="diagram-caption">DiscordやSNSにそのまま投稿できる高画質画像</span>
        </div>
      )
    case 'visual-settings':
      return (
        <div className="mini-diagram settings-diagram">
          <div className="mini-palette-dots">
            <span className="mini-dot mint">🌿</span>
            <span className="mini-dot sky">🌊</span>
            <span className="mini-dot lavender">🔮</span>
            <span className="mini-dot pink">🌸</span>
            <span className="mini-dot orange">🍊</span>
          </div>
          <div className="mini-name-badge">
            ADVENTURER: <strong>あなたの活動名</strong>
          </div>
          <span className="diagram-caption">自分好みのカラーと名前でモチベーションUP</span>
        </div>
      )
    case 'visual-backup':
      return (
        <div className="mini-diagram backup-diagram">
          <div className="mini-backup-device">
            <span>💻 あなたの端末 (ブラウザ)</span>
            <span className="secure-badge">🔒 完全非公開・安全</span>
          </div>
          <div className="mini-backup-btns">
            <span className="mini-b-btn">📥 保存 (JSON)</span>
            <span className="mini-b-btn">📤 復元</span>
          </div>
          <span className="diagram-caption">無料 ＆ ログイン不要でデータ紛失も防止</span>
        </div>
      )
    default:
      return null
  }
}

function App() {
  const exportRef = useRef(null)
  const exportOffscreenRef = useRef(null)

  // ユーザー設定ステート（ユーザー名・テーマカラー）
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('progressQuestUserName') || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    localStorage.setItem('progressQuestUserName', userName)
  }, [userName])

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('progressQuestTheme') || 'mint'
    } catch {
      return 'mint'
    }
  })

  useEffect(() => {
    localStorage.setItem('progressQuestTheme', theme)
  }, [theme])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const handleExportImage = async () => {
    // 画像専用レイアウト（全段展開・余白付き）をキャプチャする
    const targetElement = exportOffscreenRef.current || exportRef.current
    if (!targetElement) return

    try {
      const dataUrl = await toPng(targetElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      })

      const link = document.createElement('a')
      const cleanTitle = (registeredGoal?.title || 'progress-quest')
        .replace(/[\\/:*?"<>|]/g, '')
        .slice(0, 15)
      link.download = `${cleanTitle}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('画像の保存に失敗しました:', error)
      alert('画像の保存に失敗しました。')
    }
  }

  // 手動登録モーダル用ステート
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [deliverableCount, setDeliverableCount] = useState(3)
  const [deadline, setDeadline] = useState('')
  const [description, setDescription] = useState('')
  const [deliverableNames, setDeliverableNames] = useState([])

  // テンプレート登録モーダル用ステート
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateStep, setTemplateStep] = useState('input') // 'input' | 'confirm'
  const [confirmTab, setConfirmTab] = useState('stages') // 'stages' | 'global'
  const [templateRawText, setTemplateRawText] = useState('')
  const [templateError, setTemplateError] = useState('')
  const [editedTemplateData, setEditedTemplateData] = useState(null)
  const [newStageTaskText, setNewStageTaskText] = useState({ 0: '', 1: '', 2: '' })

  // 保存データ用ステート
  const [registeredGoal, setRegisteredGoal] = useState(() => {
    try {
      const savedGoal = localStorage.getItem('progressQuestGoal')
      return savedGoal ? JSON.parse(savedGoal) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (registeredGoal) {
      localStorage.setItem('progressQuestGoal', JSON.stringify(registeredGoal))
    }
  }, [registeredGoal])

  const [deliverableTasks, setDeliverableTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('progressQuestTasks')
      return savedTasks ? JSON.parse(savedTasks) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('progressQuestTasks', JSON.stringify(deliverableTasks))
  }, [deliverableTasks])

  const [deliverableReflections, setDeliverableReflections] = useState(() => {
    try {
      const saved = localStorage.getItem('progressQuestReflections')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(
      'progressQuestReflections',
      JSON.stringify(deliverableReflections)
    )
  }, [deliverableReflections])

  const [selectedDeliverableIndex, setSelectedDeliverableIndex] = useState(0)
  const [newTaskName, setNewTaskName] = useState('')

  // 手動で目標を作成する処理
  const handleCreateGoal = () => {
    if (registeredGoal) {
      const confirmOverwrite = window.confirm(
        '現在の目標とタスクが上書きされます。よろしいですか？'
      )
      if (!confirmOverwrite) return
    }

    setRegisteredGoal({
      title: goalTitle.trim(),
      type: 'manual',
      deliverableCount: Number(deliverableCount),
      deliverableNames: [...deliverableNames],
      deadline: deadline,
      description: description.trim(),
    })

    setDeliverableTasks({})
    setDeliverableReflections({})
    setSelectedDeliverableIndex(0)
    setIsFormOpen(false)
  }

  // テンプレート文章を解析して確認画面へ進む処理
  const handleParseTemplate = () => {
    if (!templateRawText.trim()) {
      setTemplateError('テンプレート文章を入力または貼り付けてください。')
      return
    }

    const result = parseTemplate(templateRawText)
    if (!result.success) {
      setTemplateError(result.error || '解析に失敗しました。')
      return
    }

    setTemplateError('')
    setEditedTemplateData(result.data)
    setTemplateStep('confirm')
  }

  // 確認画面：基本情報の変更
  const handleUpdateTemplateField = (field, value) => {
    setEditedTemplateData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 確認画面：各月の情報変更
  const handleUpdateStageField = (stageIndex, field, value) => {
    setEditedTemplateData((prev) => {
      const newStages = [...prev.stages]
      newStages[stageIndex] = {
        ...newStages[stageIndex],
        [field]: value,
      }
      return { ...prev, stages: newStages }
    })
  }

  // 確認画面：タスク名変更
  const handleUpdateStageTaskName = (stageIndex, taskIndex, newName) => {
    setEditedTemplateData((prev) => {
      const newStages = [...prev.stages]
      const targetStage = { ...newStages[stageIndex] }
      targetStage.tasks = (targetStage.tasks || []).map((task, i) =>
        i === taskIndex ? { ...task, name: newName } : task
      )
      newStages[stageIndex] = targetStage
      return { ...prev, stages: newStages }
    })
  }

  // 確認画面：タスク削除
  const handleDeleteStageTask = (stageIndex, taskIndex) => {
    setEditedTemplateData((prev) => {
      const newStages = [...prev.stages]
      const targetStage = { ...newStages[stageIndex] }
      targetStage.tasks = (targetStage.tasks || []).filter(
        (_, i) => i !== taskIndex
      )
      newStages[stageIndex] = targetStage
      return { ...prev, stages: newStages }
    })
  }

  // 確認画面：タスク追加
  const handleAddStageTask = (stageIndex) => {
    const taskName = (newStageTaskText[stageIndex] || '').trim()
    if (!taskName) return

    setEditedTemplateData((prev) => {
      const newStages = [...prev.stages]
      const targetStage = { ...newStages[stageIndex] }
      targetStage.tasks = [
        ...(targetStage.tasks || []),
        {
          id: `task-${stageIndex}-${Date.now()}`,
          name: taskName,
          done: false,
        },
      ]
      targetStage.isAmbiguous = false
      targetStage.warning = undefined
      newStages[stageIndex] = targetStage
      return { ...prev, stages: newStages }
    })

    setNewStageTaskText((prev) => ({ ...prev, [stageIndex]: '' }))
  }

  // 確認後に登録を実行する処理
  const handleConfirmTemplateGoal = () => {
    if (registeredGoal) {
      const confirmOverwrite = window.confirm(
        '現在の目標とタスクが上書きされます。よろしいですか？'
      )
      if (!confirmOverwrite) return
    }

    const appData = convertToProgressAppData(editedTemplateData)
    if (!appData) return

    setRegisteredGoal(appData.goal)
    setDeliverableTasks(appData.tasks)
    setDeliverableReflections(appData.reflections)
    setSelectedDeliverableIndex(0)

    setIsTemplateModalOpen(false)
    setTemplateStep('input')
    setTemplateRawText('')
    setEditedTemplateData(null)
  }

  const stageCount = registeredGoal ? registeredGoal.deliverableCount : 3

  // 各月（ステージ）ごとの情報と進捗率
  const stagesProgress = Array.from({ length: stageCount }, (_, sIdx) => {
    const stageTasks = deliverableTasks[sIdx] || []
    const completedCount = stageTasks.filter((t) => t.done).length
    const totalCount = stageTasks.length
    const progress =
      totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
    const stageName =
      registeredGoal?.deliverableNames?.[sIdx] ||
      (registeredGoal?.type === 'template'
        ? `【${sIdx + 1}ヶ月目】`
        : `制作物 ${String(sIdx + 1).padStart(2, '0')}`)

    return {
      stageIndex: sIdx,
      stageName,
      tasks: stageTasks,
      totalCount,
      completedCount,
      progress,
      isCompleted: totalCount > 0 && completedCount === totalCount,
    }
  })

  // 全タスク数と全完了タスク数（仮の階段は除外）
  const totalRealTasks = stagesProgress.reduce((sum, s) => sum + s.totalCount, 0)
  const totalCompletedTasks = stagesProgress.reduce(
    (sum, s) => sum + s.completedCount,
    0
  )

  // 全体進捗率（全タスク基準）
  const overallProgress =
    totalRealTasks === 0
      ? 0
      : Math.round((totalCompletedTasks / totalRealTasks) * 100)

  // 階段アイテム一覧の生成（1タスク＝1段。タスク0個の月は仮の階段1段）
  const stairItems = []
  let cumulativeRealTaskIndex = 0

  stagesProgress.forEach((stage, sIdx) => {
    const isLastStage = sIdx === stageCount - 1

    if (stage.tasks.length === 0) {
      // タスクが0個の月：仮の階段を1段表示（進捗率や完了数には含めない）
      stairItems.push({
        id: `placeholder-${sIdx}`,
        name: `${stage.stageName}（タスク未登録）`,
        stageIndex: sIdx,
        stageName: stage.stageName,
        isPlaceholder: true,
        isFilled: false,
        isCurrent: false,
        isBoundary: !isLastStage,
        nextStageName: stagesProgress[sIdx + 1]?.stageName || '',
      })
    } else {
      // 1タスク＝1段
      stage.tasks.forEach((task, tIdx) => {
        const isLastTaskInStage = tIdx === stage.tasks.length - 1
        const realIndex = cumulativeRealTaskIndex
        cumulativeRealTaskIndex++

        // 仕様：タスク完了数に応じて下から順番に色が濃くなる
        const isFilled = realIndex < totalCompletedTasks
        const isCurrent = realIndex === totalCompletedTasks

        stairItems.push({
          id: task.id || `task-${sIdx}-${tIdx}`,
          name: task.name,
          stageIndex: sIdx,
          stageName: stage.stageName,
          isPlaceholder: false,
          taskDone: task.done,
          isFilled,
          isCurrent,
          isBoundary: isLastTaskInStage && !isLastStage,
          nextStageName: isLastTaskInStage
            ? stagesProgress[sIdx + 1]?.stageName || ''
            : '',
        })
      })
    }
  })

  // 確認モーダル用のプレビュー階段データ算出（リアルタイム連動）
  const previewStairs = (() => {
    if (!editedTemplateData?.stages) return []

    const items = []
    let taskCount = 0

    editedTemplateData.stages.forEach((stage, sIdx) => {
      const isLastStage = sIdx === editedTemplateData.stages.length - 1
      const stageTasks = stage.tasks || []

      if (stageTasks.length === 0) {
        // タスク0個の月：仮の階段1段
        items.push({
          id: `preview-ph-${sIdx}`,
          name: `${stage.monthTitle}（タスク未登録）`,
          stageIndex: sIdx,
          stageName: stage.monthTitle,
          isPlaceholder: true,
          isFilled: false,
          isCurrent: false,
          isBoundary: !isLastStage,
          nextStageName: editedTemplateData.stages[sIdx + 1]?.monthTitle || '',
        })
      } else {
        stageTasks.forEach((t, tIdx) => {
          const isFirstTask = taskCount === 0
          taskCount++
          const isLastTask = tIdx === stageTasks.length - 1

          items.push({
            id: t.id || `preview-task-${sIdx}-${tIdx}`,
            name: t.name,
            stageIndex: sIdx,
            stageName: stage.monthTitle,
            isPlaceholder: false,
            isFilled: false,
            isCurrent: isFirstTask, // プレビュー時は1段目を現在地★に設定
            isBoundary: isLastTask && !isLastStage,
            nextStageName: isLastTask
              ? editedTemplateData.stages[sIdx + 1]?.monthTitle || ''
              : '',
          })
        })
      }
    })

    return items
  })()

  const selectedTasks = deliverableTasks[selectedDeliverableIndex] || []
  const completedTaskCount = selectedTasks.filter((task) => task.done).length

  const taskProgress =
    selectedTasks.length === 0
      ? 0
      : Math.round((completedTaskCount / selectedTasks.length) * 100)

  const handleAddTask = () => {
    const taskName = newTaskName.trim()
    if (taskName === '') return

    setDeliverableTasks((prev) => ({
      ...prev,
      [selectedDeliverableIndex]: [
        ...(prev[selectedDeliverableIndex] || []),
        { id: `task-${selectedDeliverableIndex}-${Date.now()}`, name: taskName, done: false },
      ],
    }))

    setNewTaskName('')
  }

  const handleToggleTask = (taskIndex) => {
    setDeliverableTasks((prev) => ({
      ...prev,
      [selectedDeliverableIndex]: (
        prev[selectedDeliverableIndex] || []
      ).map((task, index) =>
        index === taskIndex ? { ...task, done: !task.done } : task
      ),
    }))
  }

  const handleDeleteTask = (taskIndex) => {
    setDeliverableTasks((prev) => ({
      ...prev,
      [selectedDeliverableIndex]: (
        prev[selectedDeliverableIndex] || []
      ).filter((_, index) => index !== taskIndex),
    }))
  }

  // データのバックアップ書き出し（JSONダウンロード）
  const handleExportDataBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userName,
        theme,
        registeredGoal,
        deliverableTasks,
        deliverableReflections,
      }
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(backupData, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute(
        'download',
        `progress-quest-backup-${new Date().toISOString().slice(0, 10)}.json`
      )
      downloadAnchor.click()
    } catch {
      alert('バックアップの書き出しに失敗しました。')
    }
  }

  // データの復元読み込み（JSONファイル選択）
  const handleImportDataBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result)
        if (!imported) throw new Error('Invalid JSON')

        const ok = window.confirm(
          '現在のデータがバックアップファイルの内容で上書きされます。よろしいですか？'
        )
        if (!ok) return

        if (imported.userName !== undefined) setUserName(imported.userName)
        if (imported.theme !== undefined) setTheme(imported.theme)
        if (imported.registeredGoal !== undefined)
          setRegisteredGoal(imported.registeredGoal)
        if (imported.deliverableTasks !== undefined)
          setDeliverableTasks(imported.deliverableTasks)
        if (imported.deliverableReflections !== undefined)
          setDeliverableReflections(imported.deliverableReflections)

        alert('データを正常に復元しました！')
        setIsSettingsOpen(false)
      } catch {
        alert(
          'ファイルの読み込みに失敗しました。正しいバックアップファイルを選択してください。'
        )
      }
    }
    reader.readAsText(file)
  }

  // 選択中ステージの追加情報
  const currentStageInfo =
    registeredGoal?.type === 'template' &&
    registeredGoal.stages?.[selectedDeliverableIndex]

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span>Progress Quest</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-btn help-btn"
            onClick={() => setIsGuideOpen(true)}
            title="使い方ガイドを見る"
          >
            📖 使い方
          </button>
          <button
            type="button"
            className="topbar-btn settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="設定（名前・テーマカラー）"
          >
            ⚙️ 設定
          </button>
          <div
            className="user-profile-badge"
            onClick={() => setIsSettingsOpen(true)}
            title="クリックしてユーザー名を変更"
          >
            <div className="user-icon">
              {userName.trim() ? userName.trim().slice(0, 1) : 'P'}
            </div>
            {userName.trim() && (
              <span className="user-name-text">{userName.trim()}</span>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="welcome">
          <p className="eyebrow">YOUR JOURNEY</p>
          <h1>一歩ずつ、目標へ。</h1>
          <p className="welcome-text">
            小さな積み重ねが、大きな成果につながる。
          </p>
        </section>

        <button
          type="button"
          className="export-button"
          onClick={handleExportImage}
        >
          📷 画像を保存
        </button>

        <section className="goal-card">
          {/* PNG画像保存の対象エリア（最終目標・伸ばしたいスキル・BCC報告目標・期限・進捗率・階段グラフのみを含む） */}
          <div className="export-target" ref={exportRef}>
            <div className="goal-header">
              <div>
                <p className="section-label">CURRENT QUEST</p>
                <h2>
                  {registeredGoal
                    ? registeredGoal.title
                    : '背景イラストを3枚完成させる'}
                </h2>

                {registeredGoal && (
                  <div className="registered-goal-info">
                    {registeredGoal.type === 'template' ? (
                      <div className="template-goal-meta">
                        {registeredGoal.skillGoal && (
                          <div className="meta-row">
                            <span className="meta-badge">伸ばしたいスキル</span>
                            <span className="meta-text">{registeredGoal.skillGoal}</span>
                          </div>
                        )}
                      {registeredGoal.serverGoal && (
                        <div className="meta-row highlight">
                          <span className="meta-badge server">BCC本サーバーへの活動報告目標</span>
                          <span className="meta-text">{registeredGoal.serverGoal}</span>
                        </div>
                      )}
                      {registeredGoal.deadline && (
                        <div className="meta-row">
                          <span className="meta-badge">期限</span>
                          <span className="meta-text">{registeredGoal.deadline}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span>制作物：{registeredGoal.deliverableCount}個</span>
                      {registeredGoal.deadline && (
                        <span>期限：{registeredGoal.deadline}</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <span className="quest-badge">冒険中</span>
          </div>

          <div className="progress-summary">
            <div>
              <span className="progress-label">全体の進捗</span>
              <div className="progress-number">
                {overallProgress}
                <span>%</span>
              </div>
            </div>
            <div className="progress-info">
              <span>完了したタスク</span>
              <strong>
                {totalCompletedTasks}
                {' / '}
                {totalRealTasks}
              </strong>
            </div>
          </div>

          {/* 月ごとの進捗率一覧 */}
          <div className="stages-progress-pills">
            {stagesProgress.map((s) => (
              <div
                key={s.stageIndex}
                className={`stage-pill ${
                  selectedDeliverableIndex === s.stageIndex ? 'active' : ''
                } ${s.isCompleted ? 'completed' : ''}`}
                onClick={() => setSelectedDeliverableIndex(s.stageIndex)}
                title={`${s.stageName}を選択`}
              >
                <div className="stage-pill-header">
                  <span className="stage-pill-name">{s.stageName}</span>
                  <span className="stage-pill-percent">{s.progress}%</span>
                </div>
                <div className="stage-pill-bar">
                  <div
                    className="stage-pill-bar-fill"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
                <span className="stage-pill-count">
                  {s.completedCount} / {s.totalCount} 完了
                </span>
              </div>
            ))}
          </div>

          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          <div className="staircase-section">
            <div className="stair-heading">
              <div className="stair-heading-title">
                <h3>目標への道のり（タスク階段）</h3>
                <span className="stair-scroll-hint">👈 横スクロールできます 👉</span>
              </div>
              <span className="stair-step-indicator">
                {selectedDeliverableIndex + 1} 段階目 / 全 {stageCount} 段階
              </span>
            </div>

            <div className="staircase">
              {stairItems.map((item, index) => {
                const totalStairs = stairItems.length
                const stairHeight =
                  totalStairs <= 1
                    ? 160
                    : 90 + (index / (totalStairs - 1)) * 140

                const statusClass = item.isPlaceholder
                  ? 'placeholder'
                  : item.isFilled
                  ? 'filled'
                  : item.isCurrent
                  ? 'current'
                  : 'future'

                const isStageSelected = selectedDeliverableIndex === item.stageIndex

                return (
                  <div key={item.id || index} className="stair-item-group">
                    <div
                      className={`stair ${statusClass} ${
                        isStageSelected ? 'selected' : ''
                      }`}
                      style={{ height: `${stairHeight}px` }}
                      onClick={() => setSelectedDeliverableIndex(item.stageIndex)}
                      title={`${item.stageName}: ${item.name}`}
                    >
                      <div className="stair-content">
                        <span className="stair-icon">
                          {item.isPlaceholder
                            ? '・'
                            : item.isFilled
                            ? '✓'
                            : item.isCurrent
                            ? '★'
                            : '○'}
                        </span>
                        <span className="stair-name">{item.name}</span>
                        <span className="stair-stage-tag">{item.stageName}</span>
                      </div>
                    </div>

                    {/* 1ヶ月目・2ヶ月目・3ヶ月目の境界線（独立した縦線） */}
                    {item.isBoundary && (
                      <div
                        className="stair-stage-divider"
                        title={`ここから ${item.nextStageName}`}
                      >
                        <div className="divider-vertical-line" />
                        <span className="divider-stage-badge">
                          {item.nextStageName}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="goal-flag">
                <span className="flag-icon">🏁</span>
                <span className="flag-label">GOAL</span>
              </div>
            </div>
          </div>
        </div>

        <div className="current-task-section">
            <div className="current-task-header">
              <div>
                <p className="section-label">CURRENT STEP</p>
                <h3>
                  {stagesProgress[selectedDeliverableIndex]?.stageName ||
                    'ステップを選択'}
                </h3>
                {currentStageInfo && (
                  <div className="stage-info-pill">
                    {currentStageInfo.targetState && (
                      <p className="stage-target-state">
                        <strong>なりたい状態：</strong>{currentStageInfo.targetState}
                      </p>
                    )}
                    {currentStageInfo.periodText && (
                      <p className="stage-period-text">
                        <strong>期間：</strong>{currentStageInfo.periodText}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="task-progress-circle">
                <span>{taskProgress}%</span>
              </div>
            </div>

            {selectedTasks.length > 0 && taskProgress === 100 && (
              <div className="completion-message">
                <h3>🎉 制作物が完成しました！</h3>
                <p>お疲れさまでした！今回の制作を振り返ってみませんか？</p>
              </div>
            )}

            <div className="reflection-section">
              <h3>制作の振り返り</h3>
              <textarea
                placeholder="今回できるようになったこと・学んだこと"
                value={deliverableReflections[selectedDeliverableIndex] || ''}
                onChange={(e) =>
                  setDeliverableReflections((prev) => ({
                    ...prev,
                    [selectedDeliverableIndex]: e.target.value,
                  }))
                }
              />
            </div>

            <div className="task-list">
              <div className="task-add-form">
                <input
                  type="text"
                  placeholder="新しいタスクを入力"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim()}
                >
                  追加
                </button>
              </div>

              {selectedTasks.length === 0 ? (
                <p className="empty-tasks-message">
                  タスクが登録されていません。上の入力欄からタスクを追加してください。
                </p>
              ) : (
                selectedTasks.map((task, index) => (
                  <div className="task-item" key={task.id || index}>
                    <input
                      type="checkbox"
                      className="task-check"
                      checked={task.done}
                      onChange={() => handleToggleTask(index)}
                    />
                    <span className={task.done ? 'task-done' : ''}>
                      {task.name}
                    </span>
                    <button
                      type="button"
                      className="task-delete-button"
                      onClick={() => handleDeleteTask(index)}
                      aria-label={`${task.name}を削除`}
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 目標作成ボタン群 */}
          <div className="goal-action-buttons">
            <button
              type="button"
              className="add-template-goal-button"
              onClick={() => {
                setTemplateStep('input')
                setTemplateError('')
                setIsTemplateModalOpen(true)
              }}
            >
              📋 テンプレートから目標を作成
            </button>
            <button
              type="button"
              className="add-manual-goal-button"
              onClick={() => setIsFormOpen(true)}
            >
              ✏️ 手動で目標を作成
            </button>
          </div>
        </section>
      </main>

      {/* ── テンプレート登録モーダル ── */}
      {isTemplateModalOpen && (
        <div className="modal-overlay">
          <div className="template-modal">
            <div className="form-header">
              <h2>
                {templateStep === 'input'
                  ? '📋 テンプレートから目標を作成'
                  : '🔍 読み取り結果の確認と修正'}
              </h2>
              <button
                className="close-button"
                onClick={() => setIsTemplateModalOpen(false)}
              >
                ×
              </button>
            </div>

            {/* ステップ1：テンプレート入力画面 */}
            {templateStep === 'input' && (
              <div className="template-step-input">
                <p className="form-description">
                  目標テンプレート文章を貼り付けて「解析して確認へ進む」を押してください。
                </p>

                <div className="template-toolbar">
                  <button
                    type="button"
                    className="template-sample-btn"
                    onClick={() => setTemplateRawText(DEFAULT_TEMPLATE_TEXT)}
                  >
                    📝 テンプレート雛形を挿入
                  </button>
                  {templateRawText && (
                    <button
                      type="button"
                      className="template-clear-btn"
                      onClick={() => setTemplateRawText('')}
                    >
                      クリア
                    </button>
                  )}
                </div>

                <textarea
                  className="template-textarea"
                  rows="14"
                  placeholder="ここにテンプレートを貼り付けてください..."
                  value={templateRawText}
                  onChange={(e) => {
                    setTemplateRawText(e.target.value)
                    if (templateError) setTemplateError('')
                  }}
                />

                {templateError && (
                  <p className="template-error-message">{templateError}</p>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setIsTemplateModalOpen(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="create-button"
                    disabled={!templateRawText.trim()}
                    onClick={handleParseTemplate}
                  >
                    解析して確認へ進む ➔
                  </button>
                </div>
              </div>
            )}

            {/* ステップ2：読み取り結果の確認・修正画面 */}
            {templateStep === 'confirm' && editedTemplateData && (
              <div className="template-step-confirm">
                <p className="form-description">
                  抽出された内容を確認してください。タスクの追加・削除や名前の編集はリアルタイムにプレビューへ反映されます。
                </p>

                {/* 🌟 階段グラフのリアルタイムプレビュー（ご要望⑥） */}
                <div className="confirm-preview-box">
                  <div className="confirm-preview-header">
                    <div className="confirm-preview-title">
                      <span className="preview-sparkle">🌟</span>
                      <h4>完成プレビュー（タスク階段）</h4>
                      <span className="preview-count-badge">
                        全 {previewStairs.filter((s) => !s.isPlaceholder).length} タスク / {previewStairs.length} 段
                      </span>
                    </div>
                    <span className="stair-scroll-hint">👈 横スクロールできます 👉</span>
                  </div>

                  <div className="staircase confirm-staircase-preview">
                    {previewStairs.map((item, index) => {
                      const totalStairs = previewStairs.length
                      const stairHeight =
                        totalStairs <= 1
                          ? 140
                          : 80 + (index / (totalStairs - 1)) * 110

                      const statusClass = item.isPlaceholder
                        ? 'placeholder'
                        : item.isCurrent
                        ? 'current'
                        : 'future'

                      return (
                        <div key={item.id || index} className="stair-item-group">
                          <div
                            className={`stair ${statusClass}`}
                            style={{ height: `${stairHeight}px` }}
                            title={`${item.stageName}: ${item.name}`}
                          >
                            <div className="stair-content">
                              <span className="stair-icon">
                                {item.isPlaceholder ? '・' : item.isCurrent ? '★' : '○'}
                              </span>
                              <span className="stair-name">{item.name}</span>
                              <span className="stair-stage-tag">{item.stageName}</span>
                            </div>
                          </div>

                          {item.isBoundary && (
                            <div className="stair-stage-divider">
                              <div className="divider-vertical-line" />
                              <span className="divider-stage-badge">
                                {item.nextStageName}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="goal-flag">
                      <span className="flag-icon">🏁</span>
                      <span className="flag-label">GOAL</span>
                    </div>
                  </div>
                </div>

                {/* タブナビゲーション（ご要望④） */}
                <div className="confirm-nav-tabs">
                  <button
                    type="button"
                    className={`confirm-nav-tab ${confirmTab === 'stages' ? 'active' : ''}`}
                    onClick={() => setConfirmTab('stages')}
                  >
                    📅 1〜3ヶ月目の目標とタスク
                  </button>
                  <button
                    type="button"
                    className={`confirm-nav-tab ${confirmTab === 'global' ? 'active' : ''}`}
                    onClick={() => setConfirmTab('global')}
                  >
                    🎯 全体目標の設定
                  </button>
                </div>

                {/* タブ1：各月の目標とタスク */}
                {confirmTab === 'stages' && (
                  <div className="confirm-section stages-tab-content">
                    <div className="stages-list">
                      {editedTemplateData.stages.map((stage, sIdx) => (
                        <div className="confirm-stage-card" key={sIdx}>
                          <div className="stage-card-header">
                            <div className="stage-card-title-group">
                              <h4>【{stage.monthTitle}】</h4>
                              {stage.statusBadge && (
                                <span
                                  className={`status-badge-tag ${
                                    stage.status === 'exact'
                                      ? 'exact'
                                      : stage.status === 'inferred'
                                      ? 'inferred'
                                      : 'ambiguous'
                                  }`}
                                >
                                  {stage.statusBadge}
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              className="stage-deadline-input"
                              placeholder="期限（例: 〜 10月31日）"
                              value={stage.deadlineText}
                              onChange={(e) =>
                                handleUpdateStageField(
                                  sIdx,
                                  'deadlineText',
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {/* AIの解釈メモ・注記 */}
                          {stage.statusNotes && stage.statusNotes.length > 0 && (
                            <div className="status-notes-box">
                              <span className="notes-icon">💡</span>
                              <div className="notes-list">
                                {stage.statusNotes.map((note, nIdx) => (
                                  <span key={nIdx} className="note-text">
                                    {note}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="stage-fields-grid">
                            <label>
                              この時点でなりたい状態
                              <input
                                type="text"
                                value={stage.targetState}
                                onChange={(e) =>
                                  handleUpdateStageField(
                                    sIdx,
                                    'targetState',
                                    e.target.value
                                  )
                                }
                              />
                            </label>

                            <label>
                              数字の目安
                              <input
                                type="text"
                                value={stage.targetNumber}
                                onChange={(e) =>
                                  handleUpdateStageField(
                                    sIdx,
                                    'targetNumber',
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>

                          {/* 曖昧・注意警告メッセージ */}
                          {stage.warning && (
                            <div className="ambiguous-warning">
                              <span className="warning-icon">⚠️</span>
                              <span>{stage.warning}</span>
                            </div>
                          )}

                          {/* タスク一覧の編集 */}
                          <div className="stage-tasks-manager">
                            <p className="tasks-label">
                              生成されたタスク（{stage.tasks?.length || 0}個）：
                            </p>

                            <div className="confirm-tasks-list">
                              {(stage.tasks || []).map((task, tIdx) => (
                                <div className="confirm-task-item" key={task.id || tIdx}>
                                  <span className="task-num">{tIdx + 1}.</span>
                                  <input
                                    type="text"
                                    className="task-name-input"
                                    value={task.name}
                                    onChange={(e) =>
                                      handleUpdateStageTaskName(
                                        sIdx,
                                        tIdx,
                                        e.target.value
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="task-delete-icon-btn"
                                    onClick={() =>
                                      handleDeleteStageTask(sIdx, tIdx)
                                    }
                                    title="このタスクを削除"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* タスクの追加フォーム */}
                            <div className="stage-task-add-row">
                              <input
                                type="text"
                                placeholder={`【${stage.monthTitle}】にタスクを追加`}
                                value={newStageTaskText[sIdx] || ''}
                                onChange={(e) =>
                                  setNewStageTaskText((prev) => ({
                                    ...prev,
                                    [sIdx]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddStageTask(sIdx)
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="stage-task-add-btn"
                                disabled={!(newStageTaskText[sIdx] || '').trim()}
                                onClick={() => handleAddStageTask(sIdx)}
                              >
                                ＋ 追加
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* タブ2：全体目標の設定 */}
                {confirmTab === 'global' && (
                  <div className="confirm-section global-tab-content">
                    <div className="confirm-grid">
                      <label>
                        目標タイトル（アプリ上部に表示）
                        <input
                          type="text"
                          value={editedTemplateData.title}
                          onChange={(e) =>
                            handleUpdateTemplateField('title', e.target.value)
                          }
                        />
                      </label>

                      <label>
                        ① 伸ばしたいスキル・分野
                        <input
                          type="text"
                          value={editedTemplateData.skillGoal}
                          onChange={(e) =>
                            handleUpdateTemplateField('skillGoal', e.target.value)
                          }
                        />
                      </label>

                      <label>
                        ② 3ヶ月後のアウトプット目標
                        <input
                          type="text"
                          value={editedTemplateData.outputGoal}
                          onChange={(e) =>
                            handleUpdateTemplateField('outputGoal', e.target.value)
                          }
                        />
                      </label>

                      <label className="highlight-field">
                        ③ BCC本サーバーへの活動報告目標
                        <input
                          type="text"
                          value={editedTemplateData.serverGoal}
                          onChange={(e) =>
                            handleUpdateTemplateField('serverGoal', e.target.value)
                          }
                        />
                      </label>

                      <label>
                        最終期限（任意）
                        <input
                          type="text"
                          placeholder="例：〜 12月31日"
                          value={editedTemplateData.deadline}
                          onChange={(e) =>
                            handleUpdateTemplateField('deadline', e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setTemplateStep('input')}
                  >
                    ← 戻る（文章を変更）
                  </button>
                  <button
                    type="button"
                    className="create-button"
                    disabled={!editedTemplateData.title.trim()}
                    onClick={handleConfirmTemplateGoal}
                  >
                    ✓ この内容で目標を登録する
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 手動登録フォーム（既存機能） ── */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="goal-form">
            <div className="form-header">
              <h2>手動で目標を作成</h2>
              <button
                className="close-button"
                onClick={() => setIsFormOpen(false)}
              >
                ×
              </button>
            </div>

            <p className="form-description">
              目標と制作物の数を設定して、新しい冒険を始めよう。
            </p>

            <label>
              目標タイトル
              <input
                type="text"
                placeholder="例：背景イラストを3枚完成させる"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </label>

            <label>
              制作物の数
              <input
                type="number"
                min="1"
                max="20"
                value={deliverableCount}
                onChange={(e) => setDeliverableCount(Number(e.target.value))}
              />
            </label>

            <div className="deliverable-name-fields">
              <p>制作物の名前（任意）</p>

              {Array.from({ length: Number(deliverableCount) }, (_, index) => (
                <label key={index}>
                  制作物 {index + 1}
                  <input
                    type="text"
                    placeholder={`例：イラスト ${String(index + 1).padStart(
                      2,
                      '0'
                    )}`}
                    value={deliverableNames[index] || ''}
                    onChange={(e) => {
                      const newNames = [...deliverableNames]
                      newNames[index] = e.target.value
                      setDeliverableNames(newNames)
                    }}
                  />
                </label>
              ))}
            </div>

            <label>
              目標期限（任意）
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>

            <label>
              目標の説明（任意）
              <textarea
                rows="3"
                placeholder="目標の詳細や、達成したいことを記入"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="form-actions">
              <button
                className="cancel-button"
                onClick={() => setIsFormOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="create-button"
                disabled={
                  goalTitle.trim() === '' ||
                  deliverableCount < 1 ||
                  deliverableCount > 20
                }
                onClick={handleCreateGoal}
              >
                目標を作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 設定モーダル（ユーザー名・テーマカラー・データバックアップ） ── */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="settings-modal">
            <div className="form-header">
              <h2>⚙️ アプリ設定</h2>
              <button
                type="button"
                className="close-button"
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <p className="form-description">
              あなたの活動名とお好みのテーマカラーを設定できます。設定は自動保存されます。
            </p>

            {/* ユーザー名設定 */}
            <div className="settings-section">
              <h3>👤 ユーザー名（ニックネーム・活動名）</h3>
              <p className="settings-subtext">
                Discordなどの活動名を入力してください。PNG画像にも表示されます（未登録でも利用可能）。
              </p>
              <div className="settings-input-group">
                <input
                  type="text"
                  className="settings-user-input"
                  placeholder="例：ハルタ"
                  maxLength={24}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                {userName && (
                  <button
                    type="button"
                    className="settings-clear-btn"
                    onClick={() => setUserName('')}
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {/* テーマカラー選択 */}
            <div className="settings-section">
              <h3>🎨 テーマカラーの選択</h3>
              <p className="settings-subtext">
                お好みの配色を選ぶと、アプリ全体と保存画像のデザインが一括で切り替わります。
              </p>
              <div className="theme-palette-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-chip-btn ${theme === t.id ? 'active' : ''}`}
                    onClick={() => setTheme(t.id)}
                  >
                    <span
                      className="theme-color-dot"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="theme-chip-info">
                      <span className="theme-chip-name">
                        {t.icon} {t.name}
                      </span>
                      <span className="theme-chip-desc">{t.desc}</span>
                    </div>
                    {theme === t.id && (
                      <span className="theme-active-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* データ管理（バックアップ・復元 ＆ 注意書き） */}
            <div className="settings-section backup-section">
              <h3>💾 データのバックアップと復元</h3>
              <p className="settings-subtext">
                データはお使いの端末（ブラウザ）に安全に保存されます。機種変更やブラウザデータ消去に備えて、目標やタスクのバックアップファイルを安全に保存できます。
              </p>

              <div className="backup-notice-box">
                <span className="notice-icon">⚠️</span>
                <p className="notice-text">
                  ブラウザの「閲覧履歴やキャッシュの削除」を行うと、保存された進捗データが消去される場合があります。大切な記録は定期的に「ファイルに保存（書き出し）」してください。
                </p>
              </div>

              <div className="backup-actions">
                <button
                  type="button"
                  className="backup-btn export"
                  onClick={handleExportDataBackup}
                >
                  📥 データをファイルに保存（書き出し）
                </button>

                <label className="backup-btn import">
                  📤 ファイルから復元（読み込み）
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImportDataBackup}
                  />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="create-button"
                onClick={() => setIsSettingsOpen(false)}
              >
                完了（設定を閉じる）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 使い方ガイドモーダル（案B：画面中央ポップアップモーダル） ── */}
      {isGuideOpen && (
        <div className="modal-overlay" onClick={() => setIsGuideOpen(false)}>
          <div
            className="guide-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="guide-modal-header">
              <div className="guide-header-title-group">
                <span className="guide-header-icon">📖</span>
                <div>
                  <h2>Progress Quest 冒険の歩き方（使い方ガイド）</h2>
                  <p className="guide-header-sub">
                    初めての方も安心！基本の使い方から共有・設定まで9つの手順でマスターできます。
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setIsGuideOpen(false)}
                title="閉じる"
              >
                ×
              </button>
            </div>

            <div className="guide-steps-scroll">
              <div className="guide-steps-grid">
                {GUIDE_STEPS.map((stepItem) => (
                  <div key={stepItem.step} className="guide-step-card">
                    <div className="guide-step-card-header">
                      <div className="guide-step-num-badge">
                        STEP {stepItem.step}
                      </div>
                      <span className="guide-step-tag">{stepItem.badge}</span>
                    </div>

                    <h3 className="guide-step-title">{stepItem.title}</h3>
                    <p className="guide-step-summary">{stepItem.summary}</p>

                    {/* 実際の画面を再現したミニチュアUI図解 */}
                    <div className="guide-illustration-wrapper">
                      {renderGuideIllustration(stepItem.type)}
                    </div>

                    <ul className="guide-points-list">
                      {stepItem.points.map((pt, pIdx) => (
                        <li key={pIdx}>
                          <span className="point-bullet">✦</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="guide-modal-footer">
              <button
                type="button"
                className="create-button"
                onClick={() => setIsGuideOpen(false)}
              >
                ガイドを閉じて冒険に戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PNG画像出力専用レイアウト（全段展開 ＆ 十分な余白 ＆ 操作ボタン排除） ── */}
      <div className="export-offscreen-wrapper">
        <div className="export-canvas-card" ref={exportOffscreenRef} data-theme={theme}>
          {/* レポート上部ヘッダー */}
          <div className="export-card-header">
            <div className="export-brand">
              <span className="export-brand-icon">✦</span>
              <span className="export-brand-title">Progress Quest</span>
              <span className="export-brand-sub">冒険の進捗レポート</span>
            </div>
            <div className="export-header-right">
              {userName.trim() && (
                <span className="export-user-badge">
                  ADVENTURER: <strong>{userName.trim()}</strong>
                </span>
              )}
              <span className="export-date-badge">PROGRESS REPORT</span>
            </div>
          </div>

          {/* クエスト情報 */}
          <div className="export-quest-info">
            <p className="section-label">CURRENT QUEST</p>
            <h2 className="export-quest-title">
              {registeredGoal ? registeredGoal.title : '背景イラストを3枚完成させる'}
            </h2>

            {registeredGoal && (
              <div className="export-meta-container">
                {registeredGoal.type === 'template' ? (
                  <div className="template-goal-meta">
                    {registeredGoal.skillGoal && (
                      <div className="meta-row">
                        <span className="meta-badge">伸ばしたいスキル</span>
                        <span className="meta-text">{registeredGoal.skillGoal}</span>
                      </div>
                    )}
                    {registeredGoal.serverGoal && (
                      <div className="meta-row highlight">
                        <span className="meta-badge server">BCC本サーバーへの活動報告目標</span>
                        <span className="meta-text">{registeredGoal.serverGoal}</span>
                      </div>
                    )}
                    {registeredGoal.deadline && (
                      <div className="meta-row">
                        <span className="meta-badge">期限</span>
                        <span className="meta-text">{registeredGoal.deadline}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="template-goal-meta">
                    <div className="meta-row">
                      <span className="meta-badge">制作物</span>
                      <span className="meta-text">{registeredGoal.deliverableCount}個</span>
                    </div>
                    {registeredGoal.deadline && (
                      <div className="meta-row">
                        <span className="meta-badge">期限</span>
                        <span className="meta-text">{registeredGoal.deadline}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 進捗サマリー */}
          <div className="progress-summary export-summary">
            <div>
              <span className="progress-label">全体の進捗</span>
              <div className="progress-number">
                {overallProgress}
                <span>%</span>
              </div>
            </div>
            <div className="progress-info">
              <span>完了したタスク</span>
              <strong>
                {totalCompletedTasks} / {totalRealTasks}
              </strong>
            </div>
          </div>

          {/* 月ごとの進捗ピル */}
          <div className="stages-progress-pills export-pills">
            {stagesProgress.map((s) => (
              <div
                key={s.stageIndex}
                className={`stage-pill ${s.isCompleted ? 'completed' : ''}`}
              >
                <div className="stage-pill-header">
                  <span className="stage-pill-name">{s.stageName}</span>
                  <span className="stage-pill-percent">{s.progress}%</span>
                </div>
                <div className="stage-pill-bar">
                  <div
                    className="stage-pill-bar-fill"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
                <span className="stage-pill-count">
                  {s.completedCount} / {s.totalCount} 完了
                </span>
              </div>
            ))}
          </div>

          <div className="progress-bar export-progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {/* 階段グラフ（全段数を横スクロールなしで完全に並べる） */}
          <div className="export-staircase-container">
            <div className="staircase export-staircase-view">
              {stairItems.map((item, index) => {
                const totalStairs = stairItems.length
                const stairHeight =
                  totalStairs <= 1
                    ? 160
                    : 90 + (index / (totalStairs - 1)) * 140

                const statusClass = item.isPlaceholder
                  ? 'placeholder'
                  : item.isFilled
                  ? 'filled'
                  : item.isCurrent
                  ? 'current'
                  : 'future'

                return (
                  <div key={`export-${item.id || index}`} className="stair-item-group">
                    <div
                      className={`stair ${statusClass}`}
                      style={{ height: `${stairHeight}px` }}
                    >
                      <div className="stair-content">
                        <span className="stair-icon">
                          {item.isPlaceholder
                            ? '・'
                            : item.isFilled
                            ? '✓'
                            : item.isCurrent
                            ? '★'
                            : '○'}
                        </span>
                        <span className="stair-name">{item.name}</span>
                        <span className="stair-stage-tag">{item.stageName}</span>
                      </div>
                    </div>

                    {item.isBoundary && (
                      <div className="stair-stage-divider">
                        <div className="divider-vertical-line" />
                        <span className="divider-stage-badge">
                          {item.nextStageName}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="goal-flag">
                <span className="flag-icon">🏁</span>
                <span className="flag-label">GOAL</span>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="export-card-footer">
            <span>小さな積み重ねが、大きな成果につながる。</span>
            <span>✦ Progress Quest</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');

// ソースディレクトリとターゲットディレクトリを定義
const sourceDir = path.join(__dirname, '../pre-publish');
const targetDir = path.join(__dirname, '../articles');

// ターゲットディレクトリが存在するか確認
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 唯一のファイル名を生成
const generateUniqueFileName = (existingFiles) => {
    let fileName;
    do {
        fileName = crypto.randomBytes(16).toString('hex'); // 32文字のランダムな文字列
    } while (existingFiles.includes(`${fileName}.md`)); // 重複チェック
    return fileName;
};

// すでに存在する記事のタイトルとファイル情報を収集
const existingArticles = fs.readdirSync(targetDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
        const filePath = path.join(targetDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);
        return { title: data.title, fileName: file };
    });

// `pre-publish` フォルダ内のMarkdownファイルを処理
fs.readdirSync(sourceDir).forEach((file) => {
    const sourceFilePath = path.join(sourceDir, file);

    if (path.extname(file) === '.md') {
        const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
        const { data: sourceData, content: sourceBody } = matter(sourceContent);

        // `title` が存在するか確認
        if (!sourceData.title) {
            console.error(`エラー: 必須フィールド (title) が見つかりません: ${file}。スキップします...`);
            return;
        }

        // 既存の記事を確認
        const existingArticle = existingArticles.find((article) => article.title === sourceData.title);

        if (existingArticle) {
            // 既存ファイルを更新
            const targetFilePath = path.join(targetDir, existingArticle.fileName);
            console.log(`既存の記事を更新中: ${sourceData.title}`);

            const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
            const { data: targetData } = matter(targetContent);

            // 内容を更新（既存のヘッダーを手动生成）
            const frontMatter = `---\n` +
                `title: "${targetData.title}"\n` +
                `emoji: "${targetData.emoji}"\n` +
                `type: "${targetData.type}"\n` +
                `topics:\n${targetData.topics.map((topic) => `  - "${topic}"`).join('\n')}\n` +
                `published: ${targetData.published}\n` +
                (targetData.published_at ? `published_at: "${targetData.published_at}"\n` : '') +
                `---`;

            const updatedContent = `${frontMatter}\n\n${sourceBody}`;
            fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
            console.log(`更新しました: ${targetFilePath}`);
        } else {
            // 新しい記事を作成
            const uniqueFileName = generateUniqueFileName(existingArticles.map((article) => article.fileName));
            const targetFilePath = path.join(targetDir, `${uniqueFileName}.md`);

            const metadata = {
                title: sourceData.title,
                emoji: sourceData.emoji || '📄',
                type: sourceData.type || 'tech',
                topics: sourceData.topics || ['default'],
                published: sourceData.published !== undefined ? sourceData.published : true,
            };

            const frontMatter = `---\n` +
                `title: "${metadata.title}"\n` +
                `emoji: "${metadata.emoji}"\n` +
                `type: "${metadata.type}"\n` +
                `topics:\n${metadata.topics.map((topic) => `  - "${topic}"`).join('\n')}\n` +
                `published: ${metadata.published}\n` +
                `---`;

            const updatedContent = `${frontMatter}\n\n${sourceBody}`;
            fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
            console.log(`新規作成: ${targetFilePath}`);
        }
    }
});
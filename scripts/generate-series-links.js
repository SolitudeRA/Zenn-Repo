const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * pre-publish と articles に基づいてシリーズ記事のリンクを生成し、articles を更新する
 * @param {string} prePublishDir - シリーズ記事を含むディレクトリ
 * @param {string} articlesDir - Zenn の記事ディレクトリ
 */
const generateSeriesLinksForZenn = (prePublishDir, articlesDir) => {
    const SERIES_START = '<!-- START_SERIES -->';
    const SERIES_END = '<!-- END_SERIES -->';

    // ディレクトリが存在するか確認
    if (!fs.existsSync(prePublishDir) || !fs.existsSync(articlesDir)) {
        console.error(`エラー: ディレクトリが見つかりません: ${prePublishDir}, ${articlesDir}`);
        process.exit(1);
    }

    // pre-publish 内の記事を読み込み、タイトルとシリーズを抽出
    const prePublishArticles = fs.readdirSync(prePublishDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(prePublishDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                series: parsed.data.series || null, // series プロパティがない場合、null とする
            };
        })
        .filter((article) => article.series); // series がないまたは null の記事を除外

    if (prePublishArticles.length === 0) {
        console.log("シリーズが定義されている記事が pre-publish ディレクトリにありません。終了します。");
        return;
    }

    // articles 内の記事を読み込み、タイトルと slug を抽出
    const articles = fs.readdirSync(articlesDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(articlesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                slug: file.replace('.md', ''), // ファイル名から拡張子を除外して slug とする
                filePath,
                metadata: parsed.data,
                content: parsed.content,
            };
        });

    // pre-publish 内の記事を series ごとにグループ化
    const seriesMap = {};
    prePublishArticles.forEach((article) => {
        if (!seriesMap[article.series]) {
            seriesMap[article.series] = [];
        }
        seriesMap[article.series].push(article);
    });

    // 各シリーズについてリンクを生成し、articles 内の記事を更新
    Object.keys(seriesMap).forEach((series) => {
        const articlesInSeries = seriesMap[series];

        // pre-publish 内でのファイル名順でソート
        articlesInSeries.sort((a, b) => a.file.localeCompare(b.file));

        // シリーズごとのリンクを生成
        articlesInSeries.forEach((article) => {
            const targetArticle = articles.find((a) => a.title === article.title);
            if (!targetArticle) {
                console.error(`エラー: 該当する articles の記事が見つかりません: ${article.title}`);
                return;
            }

            // 現在の記事を除外し、シリーズリンクを生成
            const filteredArticles = articlesInSeries.filter((a) => a.title !== article.title);

            const seriesLinks = `${SERIES_START}\n\n` +
                `${series} シリーズ記事：\n\n` +
                filteredArticles.map((filteredArticle) => {
                    const targetSlug = articles.find((a) => a.title === filteredArticle.title)?.slug;
                    if (!targetSlug) {
                        console.error(`エラー: 該当する slug が見つかりません: ${filteredArticle.title}`);
                        return null;
                    }
                    return `[${filteredArticle.title}](https://zenn.dev/solitudera/articles/${targetSlug})`;
                }).filter(Boolean).join('\n') +
                `\n\n${SERIES_END}`;

            // 記事内容を取得し、シリーズリンクブロックを更新
            const contentLines = targetArticle.content.split('\n');
            const startIndex = contentLines.indexOf(SERIES_START);
            const endIndex = contentLines.indexOf(SERIES_END);

            if (startIndex !== -1 && endIndex !== -1) {
                // 既存のシリーズリンクを置き換え
                contentLines.splice(startIndex, endIndex - startIndex + 1, ...seriesLinks.split('\n'));
                console.log(`シリーズリンクを更新しました: ${targetArticle.file}`);
            } else {
                // シリーズリンクが存在しない場合、追加
                contentLines.unshift(seriesLinks);
                console.log(`シリーズリンクを挿入しました: ${targetArticle.file}`);
            }

            // 記事内容を更新
            const updatedContent = contentLines.join('\n').replace(/\n{3,}/g, '\n\n'); // 連続する空行を整理
            const newFileContent = matter.stringify(updatedContent, targetArticle.metadata);

            fs.writeFileSync(targetArticle.filePath, newFileContent, 'utf8');
        });
    });

    console.log('シリーズリンクの生成と更新が完了しました。');
};

// 他のファイルで使用するためのエクスポート
module.exports = generateSeriesLinksForZenn;

// コマンドライン引数からディレクトリを取得して実行
if (require.main === module) {
    const prePublishDir = process.argv[2];
    const articlesDir = process.argv[3];

    if (!prePublishDir || !articlesDir) {
        console.error("エラー: ディレクトリ引数が不足しています。使用方法: node generate-series-links.js <pre-publish-dir> <articles-dir>");
        process.exit(1);
    }

    generateSeriesLinksForZenn(prePublishDir, articlesDir);
}
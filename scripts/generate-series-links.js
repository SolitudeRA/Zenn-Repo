const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * <<<タイトル>>> 記法を文中から検出し、対応するZenn記事へのリンク形式に変換する関数。
 * 
 * 例: <<<タイトル>>> -> [タイトル](https://zenn.dev/solitudera/articles/...)
 * 
 * @param {string} content 対象記事のテキストコンテンツ
 * @param {Array} articles 記事メタ情報（title, slugなど）を持つオブジェクトの配列
 * @returns {string} 変換後のテキストコンテンツ
 */
function replaceInlineSeriesLinks(content, articles) {
    const regex = /<<<([^>]+)>>>/g;
    return content.replace(regex, (match, p1) => {
        const title = p1.trim();
        const foundArticle = articles.find(a => a.title === title);
        if (foundArticle) {
            const zennLink = `https://zenn.dev/solitudera/articles/${foundArticle.slug}`;
            return `[${title}](${zennLink})`;
        }
        // 対応する記事が見つからない場合はそのまま返す
        return match;
    });
}

/**
 * pre-publish ディレクトリと articles ディレクトリに基づいてシリーズ記事リンクを生成し、
 * Zenn記事のMarkdownファイルを更新する関数。
 * 
 * シリーズ情報をもとに、該当するZenn記事内に
 * <!-- START_SERIES --> ... <!-- END_SERIES --> のブロックを挿入または更新し、
 * さらに <<<タイトル>>> 記法を対応するZennリンクへと変換する。
 * 
 * @param {string} prePublishDir シリーズ記事が格納されているディレクトリパス
 * @param {string} articlesDir Zenn用記事が格納されているディレクトリパス
 */
const generateSeriesLinksForZenn = (prePublishDir, articlesDir) => {
    const SERIES_START = '<!-- START_SERIES -->';
    const SERIES_END = '<!-- END_SERIES -->';

    // ディレクトリ存在確認
    if (!fs.existsSync(prePublishDir) || !fs.existsSync(articlesDir)) {
        console.error(`エラー: 指定されたディレクトリが見つかりません: ${prePublishDir}, ${articlesDir}`);
        process.exit(1);
    }

    // pre-publish ディレクトリ内の記事を読み込み、タイトルとシリーズ情報を取得
    const prePublishArticles = fs.readdirSync(prePublishDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(prePublishDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                series: parsed.data.series || null, // series プロパティがない場合は null
            };
        })
        .filter((article) => article.series); // series が設定されていない記事は除外

    if (prePublishArticles.length === 0) {
        console.log("シリーズが定義されている記事が見つからないため、処理を終了します。");
        return;
    }

    // articles ディレクトリ内のZenn記事を読み込み、タイトルとslug、メタ情報を取得
    const articles = fs.readdirSync(articlesDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(articlesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                slug: file.replace('.md', ''), // ファイル名から拡張子を除去し、slugとして使用
                filePath,
                metadata: parsed.data,
                content: parsed.content,
            };
        });

    // pre-publish記事を series ごとにグループ化
    const seriesMap = {};
    prePublishArticles.forEach((article) => {
        if (!seriesMap[article.series]) {
            seriesMap[article.series] = [];
        }
        seriesMap[article.series].push(article);
    });

    // 各シリーズについてリンク生成と記事更新を実行
    Object.keys(seriesMap).forEach((series) => {
        const articlesInSeries = seriesMap[series];

        // pre-publish ディレクトリ内の記事をファイル名順でソート
        articlesInSeries.sort((a, b) => a.file.localeCompare(b.file));

        articlesInSeries.forEach((article) => {
            const targetArticle = articles.find((a) => a.title === article.title);
            if (!targetArticle) {
                console.error(`エラー: 対応する記事が見つかりません: ${article.title}`);
                return;
            }

            // シリーズ内の他の記事へのリンクを生成（対象記事自身は除外）
            const filteredArticles = articlesInSeries.filter((a) => a.title !== article.title);

            const seriesLinks = `${SERIES_START}\n\n` +
                `${series} シリーズ記事：\n\n` +
                filteredArticles.map((filteredArticle) => {
                    const targetSlug = articles.find((a) => a.title === filteredArticle.title)?.slug;
                    if (!targetSlug) {
                        console.error(`エラー: 対応するslugが見つかりません: ${filteredArticle.title}`);
                        return null;
                    }
                    return `[${filteredArticle.title}](https://zenn.dev/solitudera/articles/${targetSlug})`;
                }).filter(Boolean).join('\n') +
                `\n\n${SERIES_END}`;

            // 記事内容を行単位で取得し、シリーズリンクブロックを挿入または更新
            const contentLines = targetArticle.content.split('\n');
            const startIndex = contentLines.indexOf(SERIES_START);
            const endIndex = contentLines.indexOf(SERIES_END);

            if (startIndex !== -1 && endIndex !== -1) {
                // 既存のシリーズリンクブロックを更新
                contentLines.splice(startIndex, endIndex - startIndex + 1, ...seriesLinks.split('\n'));
                console.log(`シリーズリンクを更新しました: ${targetArticle.file}`);
            } else {
                // シリーズリンクブロックが存在しない場合は先頭に追加
                contentLines.unshift(seriesLinks);
                console.log(`シリーズリンクを挿入しました: ${targetArticle.file}`);
            }

            // コンテンツ再構築
            let updatedContent = contentLines.join('\n').replace(/\n{3,}/g, '\n\n'); // 連続する空行を整理
            updatedContent = replaceInlineSeriesLinks(updatedContent, articles); // <<<タイトル>>> 表記をZennリンクへ変換

            const newFileContent = matter.stringify(updatedContent, targetArticle.metadata);

            fs.writeFileSync(targetArticle.filePath, newFileContent, 'utf8');
        });
    });

    console.log('シリーズリンクの生成と更新が完了しました。');
};

module.exports = generateSeriesLinksForZenn;

if (require.main === module) {
    const prePublishDir = process.argv[2];
    const articlesDir = process.argv[3];

    if (!prePublishDir || !articlesDir) {
        console.error("エラー: ディレクトリ引数が不足しています。使用方法: node generate-series-links.js <pre-publish-dir> <articles-dir>");
        process.exit(1);
    }

    generateSeriesLinksForZenn(prePublishDir, articlesDir);
}
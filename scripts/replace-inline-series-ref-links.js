#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * 文中の <<<タイトル>>> のプレースホルダを対応する Zenn 記事リンクに置き換える
 * @param {string} content - 処理対象の記事コンテンツ
 * @param {Array} articles - 解析済みの articles 配列。title と slug 情報を含む
 * @returns {string} - 置き換え後のコンテンツ
 */
function replaceInlineSeriesLinks(content, articles) {
    // <<<xxxx>>> 形式の一致を検出
    const regex = /<<<([^>]+)>>>/g;
    return content.replace(regex, (match, p1) => {
        const foundArticle = articles.find(a => a.title === p1.trim());
        if (foundArticle) {
            const zennLink = `https://zenn.dev/solitudera/articles/${foundArticle.slug}`;
            return `[${p1}](${zennLink})`;
        }
        return match; // 該当する記事が見つからない場合はそのままにする
    });
}

async function main() {
    const articlesDir = process.argv[2];

    if (!articlesDir) {
        console.error('使用方法: node replace-inline-series-links.js <articles-dir>');
        process.exit(1);
    }

    if (!fs.existsSync(articlesDir)) {
        console.error(`エラー: ディレクトリが見つかりません: ${articlesDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(articlesDir).filter((file) => file.endsWith('.md'));

    if (files.length === 0) {
        console.log('指定されたディレクトリに Markdown ファイルが存在しません。');
        return;
    }

    // 記事マッピングを構築
    const articles = files.map((file) => {
        const filePath = path.join(articlesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(content);
        return {
            file,
            title: parsed.data.title,
            slug: file.replace('.md', ''),
            filePath,
            metadata: parsed.data,
            content: parsed.content,
        };
    });

    // 各ファイルを処理
    for (const article of articles) {
        const updatedContent = replaceInlineSeriesLinks(article.content, articles);
        if (updatedContent !== article.content) {
            // コンテンツに変更がある場合、ファイルに書き戻す
            const newFileContent = matter.stringify(updatedContent, article.metadata);
            fs.writeFileSync(article.filePath, newFileContent, 'utf8');
            console.log(`リンクを更新しました: ${article.file}`);
        }
    }

    console.log('プレースホルダ置き換え処理が完了しました。');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
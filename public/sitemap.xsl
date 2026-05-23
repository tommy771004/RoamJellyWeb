<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { color: #f43f5e; font-size: 24px; }
          .desc { margin-bottom: 20px; color: #666; }
          table { border: none; border-collapse: collapse; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background-color: #f8fafc; text-align: left; padding: 12px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          tr:hover { background-color: #f1f5f9; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>XML Sitemap</h1>
        <p class="desc">
          This is an XML Sitemap, meant for consumption by search engines like Google and Bing.<br/>
          You can find more information about XML sitemaps on <a href="https://sitemaps.org">sitemaps.org</a>.
        </p>
        <p class="desc">
          This sitemap contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.
        </p>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Last Modified</th>
              <th>Change Frequency</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td>
                  <xsl:variable name="itemURL">
                    <xsl:value-of select="sitemap:loc"/>
                  </xsl:variable>
                  <a href="{$itemURL}">
                    <xsl:value-of select="sitemap:loc"/>
                  </a>
                </td>
                <td>
                  <xsl:value-of select="sitemap:lastmod"/>
                </td>
                <td>
                  <xsl:value-of select="sitemap:changefreq"/>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

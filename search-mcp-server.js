#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const cheerio = require('cheerio');

class SearchMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'search-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'web_search',
          description: '搜索网络内容并返回结果',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: '搜索关键词',
              },
              num_results: {
                type: 'number',
                description: '返回结果数量 (默认5)',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_webpage',
          description: '获取指定网页的内容',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: '网页URL',
              },
            },
            required: ['url'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'web_search':
          return await this.handleWebSearch(request.params.arguments);
        case 'get_webpage':
          return await this.handleGetWebpage(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async handleWebSearch(args) {
    try {
      const { query, num_results = 5 } = args;
      
      // 使用DuckDuckGo搜索 (不需要API key)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result').slice(0, num_results).each((i, elem) => {
        const title = $(elem).find('.result__title a').text().trim();
        const url = $(elem).find('.result__title a').attr('href');
        const snippet = $(elem).find('.result__snippet').text().trim();
        
        if (title && url) {
          results.push({
            title,
            url: url.startsWith('http') ? url : `https:${url}`,
            snippet
          });
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              results,
              total_found: results.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `搜索失败: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async handleGetWebpage(args) {
    try {
      const { url } = args;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000,
        maxContentLength: 1024 * 1024 // 1MB limit
      });

      const $ = cheerio.load(response.data);
      
      // 移除脚本和样式
      $('script, style, nav, footer, aside').remove();
      
      // 提取主要内容
      const title = $('title').text().trim();
      const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              url,
              title,
              content,
              length: content.length
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `获取网页失败: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Search MCP server running on stdio');
  }
}

const server = new SearchMCPServer();
server.run().catch(console.error);

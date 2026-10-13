// Markdown (Studio "Text Markdown" fields) -> the rich-text document shape the block renderer
// reads (richTextHtml in app/utils/blocks.ts): doc / paragraph / heading / lists / blockquote /
// hard_break / horizontal_rule / image / code_block, text with bold/italic/strike/code/link marks.
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough'
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough'

const MARKS = { strong: 'bold', emphasis: 'italic', delete: 'strike' }

function inline(node, marks) {
  switch (node.type) {
    case 'text': return node.value ? [{ type: 'text', ...(marks.length ? { marks } : {}), text: node.value }] : []
    case 'inlineCode': return [{ type: 'text', marks: [...marks, { type: 'code' }], text: node.value }]
    case 'break': return [{ type: 'hard_break' }]
    case 'image': return [{ type: 'image', attrs: { src: node.url, alt: node.alt || '', title: node.title || null } }]
    case 'link': {
      const link = { type: 'link', attrs: { href: node.url, target: null, linktype: node.url.startsWith('mailto:') ? 'email' : 'url' } }
      return node.children.flatMap(c => inline(c, [...marks, link]))
    }
    default:
      if (MARKS[node.type]) return node.children.flatMap(c => inline(c, [...marks, { type: MARKS[node.type] }]))
      return (node.children || []).flatMap(c => inline(c, marks))
  }
}

function block(node) {
  const kids = () => node.children.flatMap(block)
  switch (node.type) {
    case 'paragraph': {
      const content = node.children.flatMap(c => inline(c, []))
      // A paragraph holding only an image becomes the image itself.
      if (content.length === 1 && content[0].type === 'image') return content
      return [{ type: 'paragraph', ...(content.length ? { content } : {}) }]
    }
    case 'heading': return [{ type: 'heading', attrs: { level: node.depth }, content: node.children.flatMap(c => inline(c, [])) }]
    case 'list': return [{ type: node.ordered ? 'ordered_list' : 'bullet_list', ...(node.ordered ? { attrs: { order: node.start ?? 1 } } : {}), content: kids() }]
    case 'listItem': return [{ type: 'list_item', content: kids() }]
    case 'blockquote': return [{ type: 'blockquote', content: kids() }]
    case 'thematicBreak': return [{ type: 'horizontal_rule' }]
    case 'code': return [{ type: 'code_block', content: [{ type: 'text', text: node.value + '\n' }] }]
    case 'html': return [{ type: 'paragraph', content: [{ type: 'text', text: node.value }] }]
    default: return node.children ? kids() : []
  }
}

export function markdownToRichtext(markdown) {
  const tree = fromMarkdown(markdown, { extensions: [gfmStrikethrough()], mdastExtensions: [gfmStrikethroughFromMarkdown()] })
  return { type: 'doc', content: tree.children.flatMap(block) }
}

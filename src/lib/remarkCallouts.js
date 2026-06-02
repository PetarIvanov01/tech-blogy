import { visit } from 'unist-util-visit';

const calloutTypes = new Set(['note', 'tip', 'warning', 'caution']);

export function remarkCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective' || !calloutTypes.has(node.name)) {
        return;
      }

      const data = node.data || (node.data = {});
      const attributes = node.attributes || {};
      const label = attributes.title || node.name;

      data.hName = 'aside';
      data.hProperties = {
        className: ['callout', `callout-${node.name}`],
      };

      node.children.unshift({
        type: 'paragraph',
        data: {
          hName: 'p',
          hProperties: {
            className: ['callout-title'],
          },
        },
        children: [{ type: 'text', value: label }],
      });
    });
  };
}

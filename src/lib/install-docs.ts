/** Extract the DIY Install paste locked at README `#grok-prompt`. */
export function grokPromptPaste(readme: string): string {
  const idAt = readme.indexOf('id="grok-prompt"');
  if (idAt < 0) {
    throw new Error('README is missing id="grok-prompt"');
  }
  const fence = readme.slice(idAt).match(/```\n([\s\S]*?)\n```/);
  if (!fence?.[1]?.trim()) {
    throw new Error("README #grok-prompt has no fenced paste");
  }
  return fence[1];
}

<script lang="ts">
  import CodeEditor from '$lib/components/code-editor.svelte'
  import Markdown from '$lib/components/markdown.svelte'

  interface Props {
    value: string
    disabled?: boolean
    rows?: number
    placeholder?: string
    label?: string
    invalid?: boolean
    oninput: (value: string) => void
    onblur?: () => void
  }

  let {
    value,
    disabled = false,
    rows = 12,
    placeholder,
    label,
    invalid = false,
    oninput,
    onblur,
  }: Props = $props()

  const id = $props.id()
  let mode = $state<'edit' | 'preview'>('edit')
  const modes = [
    { value: 'edit', label: 'Edit' },
    { value: 'preview', label: 'Preview' },
  ] as const
</script>

<markdown-editor>
  <editor-modes role="tablist" aria-label="Markdown editor mode">
    {#each modes as item (item.value)}
      <button
        type="button"
        role="tab"
        id="{id}-tab-{item.value}"
        aria-controls="{id}-panel-{item.value}"
        aria-selected={mode === item.value}
        data-selected={mode === item.value || undefined}
        onclick={() => (mode = item.value)}
      >
        {item.label}
      </button>
    {/each}
  </editor-modes>

  <editor-panel
    role="tabpanel"
    id="{id}-panel-{mode}"
    aria-labelledby="{id}-tab-{mode}"
  >
    <editor-edit hidden={mode !== 'edit' || undefined}>
      <CodeEditor
        language="markdown"
        wrap
        {value}
        {disabled}
        {rows}
        {placeholder}
        {label}
        {invalid}
        {oninput}
        {onblur}
      />
    </editor-edit>
    {#if mode === 'preview'}
      <editor-preview>
        {#if value}
          <Markdown content={value} />
        {:else}
          <p data-empty>Nothing to preview.</p>
        {/if}
      </editor-preview>
    {/if}
  </editor-panel>
</markdown-editor>

<style>
  markdown-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  editor-modes {
    display: flex;
    gap: var(--space-3xs);

    button {
      padding: 0.125rem 0.75rem;
      color: var(--tui-text);
      font-size: var(--step--1);
      cursor: pointer;
      border: var(--tui-border-width) solid transparent;

      &:hover {
        background: var(--tui-surface-light);
      }

      &[data-selected] {
        font-weight: 700;
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);
        border-color: var(--bevel-recessed);
      }

      &:focus-visible {
        outline: 2px dotted var(--tui-focus);
        outline-offset: 2px;
      }
    }
  }

  editor-panel {
    display: block;

    &:focus-visible {
      outline: none;
    }
  }

  editor-edit {
    display: block;
  }

  editor-preview {
    display: block;
    min-block-size: 4.5rem;
    padding: 1rem;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    p[data-empty] {
      margin: 0;
      font-size: var(--step--1);
      color: var(--tui-muted);
    }
  }
</style>

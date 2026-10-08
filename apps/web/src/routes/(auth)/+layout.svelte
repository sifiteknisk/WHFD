<script lang="ts">
  import type { LayoutProps } from './$types'

  const { children }: LayoutProps = $props()
</script>

<auth-layout>
  <auth-container>
    {@render children()}
  </auth-container>
</auth-layout>

<style>
  auth-layout {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);
  }

  auth-container {
    display: block;
    inline-size: 100%;
    max-inline-size: 28rem;

    :global {
      auth-page {
        display: flex;
        flex-direction: column;
        gap: var(--space-s);

        > p {
          font-size: var(--step--1);
          color: var(--tui-muted);

          strong {
            color: var(--tui-text);
            font-weight: 700;
          }

          button {
            --underline: currentColor;

            display: inline;
            color: var(--tui-link);
            text-decoration: underline;
            text-decoration-color: var(--underline);
            cursor: pointer;

            &:focus-visible {
              outline: 2px dotted var(--tui-focus);
              outline-offset: 2px;
            }
          }

          &[role='alert'] {
            padding: var(--space-2xs);
            color: var(--tui-danger);
            background: var(--tui-surface-light);
            border: var(--tui-border-width) solid;
            border-color: var(--bevel-recessed);
          }
        }

        > button {
          inline-size: 100%;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: var(--space-s);

          p {
            font-size: var(--step--1);

            a {
              --underline: currentColor;

              color: var(--tui-link);
            }
          }

          button[type='submit'] {
            inline-size: 100%;
          }
        }
      }

      auth-divider {
        display: flex;
        align-items: center;
        gap: var(--space-2xs);
        font-size: var(--step--1);
        color: var(--tui-muted);

        &::before,
        &::after {
          flex: 1;
          content: '';
          border-block-start: 1px dashed var(--tui-border-mid);
        }
      }

      footer-note {
        display: block;
        font-size: var(--step--1);
        color: var(--tui-muted);
        text-align: center;

        a,
        button {
          --underline: currentColor;

          color: var(--tui-link);
          cursor: pointer;

          &:focus-visible {
            outline: 2px dotted var(--tui-focus);
            outline-offset: 2px;
          }
        }

        button {
          display: inline;
          text-decoration: underline;
          text-decoration-color: var(--underline);
        }
      }
    }
  }
</style>

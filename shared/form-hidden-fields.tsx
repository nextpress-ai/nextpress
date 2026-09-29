import { FORM_TRAP_FIELD } from "./form-model.js";

/**
 * The parts of a form visitors never see: which form this is (for a plain post with scripts off),
 * a trap field only bots fill in, and the line the runtime writes its answer into.
 */
export function FormHiddenFields({ formId }: { formId: string }) {
	return (
		<>
			<input type="hidden" name="np_form" value={formId} />
			<div className="wp-block-form__trap" aria-hidden="true">
				<label>
					Leave this empty
					<input type="text" name={FORM_TRAP_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
				</label>
			</div>
			<p className="wp-block-form__status" role="status" aria-live="polite" />
		</>
	);
}

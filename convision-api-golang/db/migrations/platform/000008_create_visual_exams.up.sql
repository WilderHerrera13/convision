-- 000008: Create visual_exams table — stores all visual acuity, refraction,
-- keratometry, IOP, and biomicroscopy findings for a clinical record.

CREATE TABLE IF NOT EXISTS visual_exams (
    id                    BIGSERIAL     PRIMARY KEY,
    clinic_id             INTEGER       NOT NULL REFERENCES clinics(id),
    clinical_record_id    BIGINT        NOT NULL REFERENCES clinical_records(id),

    -- Visual acuity without correction (SC = sine correctione)
    av_sc_dist_od         VARCHAR(20)   NULL,  -- distance, right eye
    av_sc_dist_oi         VARCHAR(20)   NULL,  -- distance, left eye
    av_sc_near_od         VARCHAR(20)   NULL,  -- near, right eye
    av_sc_near_oi         VARCHAR(20)   NULL,  -- near, left eye

    -- Visual acuity with correction (CC = cum correctione)
    av_cc_dist_od         VARCHAR(20)   NULL,  -- distance, right eye
    av_cc_dist_oi         VARCHAR(20)   NULL,  -- distance, left eye
    av_cc_near_od         VARCHAR(20)   NULL,  -- near, right eye
    av_cc_near_oi         VARCHAR(20)   NULL,  -- near, left eye

    -- Objective refraction — right eye
    ref_obj_sphere_od     NUMERIC(10,4) NULL,
    ref_obj_cylinder_od   NUMERIC(10,4) NULL,
    ref_obj_axis_od       INTEGER       NULL,

    -- Objective refraction — left eye
    ref_obj_sphere_oi     NUMERIC(10,4) NULL,
    ref_obj_cylinder_oi   NUMERIC(10,4) NULL,
    ref_obj_axis_oi       INTEGER       NULL,

    -- Subjective refraction — right eye
    ref_subj_sphere_od    NUMERIC(10,4) NULL,
    ref_subj_cylinder_od  NUMERIC(10,4) NULL,
    ref_subj_axis_od      INTEGER       NULL,

    -- Subjective refraction — left eye
    ref_subj_sphere_oi    NUMERIC(10,4) NULL,
    ref_subj_cylinder_oi  NUMERIC(10,4) NULL,
    ref_subj_axis_oi      INTEGER       NULL,

    -- Keratometry
    keratometry_od        VARCHAR(50)   NULL,
    keratometry_oi        VARCHAR(50)   NULL,

    -- Intraocular pressure (mmHg)
    iop_od                NUMERIC(6,2)  NULL,
    iop_oi                NUMERIC(6,2)  NULL,

    -- Slit-lamp findings
    biomicroscopy         TEXT          NULL,
    motility              TEXT          NULL,

    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger to keep updated_at current.
CREATE TRIGGER set_updated_at_visual_exams
    BEFORE UPDATE ON visual_exams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_visual_exams_clinic_id
    ON visual_exams (clinic_id);

CREATE INDEX IF NOT EXISTS idx_visual_exams_clinical_record_id
    ON visual_exams (clinical_record_id);
